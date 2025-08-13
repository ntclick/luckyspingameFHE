require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const ETHERSCAN_BASE = "https://api-sepolia.etherscan.io/api";
const SPIN_OUTCOME_SIG = "SpinOutcome(address,uint8,uint256,uint64)";
const SPIN_BOUGHT_SIG = "SpinBoughtWithGm(address,uint64)";
const CHECKIN_SIG = "CheckInCompleted(address,uint256)";
const GM_BOUGHT_SIG = "GmTokensBought(address,uint256)";
const GM_BOUGHT_FHE_SIG = "GmTokensBoughtFHE(address)";

const app = express();
app.use(cors());
app.use(express.json());
// Health
app.get("/", (_, res) => res.send("OK"));

function padTopicAddress(addr) {
  const clean = addr.toLowerCase().replace(/^0x/, "");
  return "0x" + "0".repeat(24) + clean;
}

async function getLogsByTopic(contract, topic, user) {
  const apiKey = process.env.REACT_APP_ETHERSCAN_API_KEY;
  if (!apiKey) throw new Error("ETHERSCAN API key missing");
  const topic0 = ethers.id(topic);
  const topic1 = padTopicAddress(user);
  const params = new URLSearchParams({
    module: "logs",
    action: "getLogs",
    fromBlock: "0",
    toBlock: "latest",
    address: contract,
    topic0,
    topic1,
    topic0_1_opr: "and",
    apikey: apiKey,
  });
  const url = `${ETHERSCAN_BASE}?${params.toString()}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json?.status !== "1" || !Array.isArray(json?.result)) return [];
  return json.result;
}

async function buildUserActivityLedger(contract, user) {
  const [spinLogs, buySpinsLogs, checkinLogs, gmBuyLogs, gmBuyFheLogs] = await Promise.all([
    getLogsByTopic(contract, SPIN_OUTCOME_SIG, user),
    getLogsByTopic(contract, SPIN_BOUGHT_SIG, user),
    getLogsByTopic(contract, CHECKIN_SIG, user),
    getLogsByTopic(contract, GM_BOUGHT_SIG, user),
    getLogsByTopic(contract, GM_BOUGHT_FHE_SIG, user),
  ]);
  const entries = [];
  for (const log of checkinLogs) {
    entries.push({
      type: "checkin",
      blockNumber: Number(log.blockNumber),
      txIndex: Number(log.transactionIndex),
      txHash: String(log.transactionHash),
    });
  }
  for (const log of buySpinsLogs) {
    const data = log?.data || "0x";
    if (data.length < 2 + 64) continue;
    const cntHex = data.slice(2 + 64 - 64, 2 + 64);
    const count = Number(BigInt("0x" + cntHex));
    entries.push({
      type: "buy_spins",
      count: Number.isFinite(count) ? count : 0,
      blockNumber: Number(log.blockNumber),
      txIndex: Number(log.transactionIndex),
      txHash: String(log.transactionHash),
    });
  }
  for (const log of spinLogs) {
    const data = log?.data || "0x";
    if (data.length < 2 + 64 * 3) continue;
    const slotHex = data.slice(2, 2 + 64);
    const prizeWeiHex = data.slice(2 + 64, 2 + 64 * 2);
    const gmDeltaHex = data.slice(2 + 64 * 2, 2 + 64 * 3);
    const slot = Number(BigInt("0x" + slotHex));
    const prizeWei = BigInt("0x" + prizeWeiHex);
    const gmDelta = Number(BigInt("0x" + gmDeltaHex));
    entries.push({
      type: "spin",
      slot: Number.isFinite(slot) ? slot : 0,
      gmDelta: Number.isFinite(gmDelta) ? gmDelta : 0,
      prizeWei,
      blockNumber: Number(log.blockNumber),
      txIndex: Number(log.transactionIndex),
      txHash: String(log.transactionHash),
    });
  }
  for (const log of gmBuyLogs) {
    const data = log?.data || "0x";
    if (data.length < 2 + 64) continue;
    const amountHex = data.slice(2, 2 + 64);
    const amt = Number(BigInt("0x" + amountHex));
    entries.push({
      type: "buy_gm_public",
      amount: Number.isFinite(amt) ? amt : 0,
      blockNumber: Number(log.blockNumber),
      txIndex: Number(log.transactionIndex),
      txHash: String(log.transactionHash),
    });
  }
  for (const log of gmBuyFheLogs) {
    entries.push({
      type: "buy_gm_fhe",
      blockNumber: Number(log.blockNumber),
      txIndex: Number(log.transactionIndex),
      txHash: String(log.transactionHash),
    });
  }
  entries.sort((a, b) => a.blockNumber - b.blockNumber || a.txIndex - b.txIndex);
  return entries;
}

function computeAggregatesFromLedger(entries) {
  let spinsBought = 0;
  let checkins = 0;
  let spinsDone = 0;
  let gmFromPrizes = 0;
  let pendingEthWei = 0n;
  let lastSlot = null;
  for (const e of entries) {
    if (e.type === "checkin") checkins += 1;
    else if (e.type === "buy_spins") spinsBought += e.count;
    else if (e.type === "spin") {
      spinsDone += 1;
      lastSlot = e.slot;
      if (e.slot === 0) pendingEthWei += ethers.parseEther("0.1");
      else if (e.slot === 1) pendingEthWei += ethers.parseEther("0.01");
      gmFromPrizes += e.gmDelta;
      if (e.prizeWei > 0n) pendingEthWei += e.prizeWei;
    }
  }
  const availableSpins = Math.max(0, spinsBought + checkins - spinsDone);
  const gmEstimated = Math.max(0, gmFromPrizes - 10 * spinsBought);
  const pendingEth = Number(ethers.formatEther(pendingEthWei));
  return { availableSpins, gmEstimated, pendingEth, lastSlot, spinsBought, spinsDone, checkins };
}

async function decryptBundleWithRelayer(contract, provider, user, signer) {
  const abi = [
    {
      inputs: [{ name: "user", type: "address" }],
      name: "getEncryptedUserBundle",
      outputs: [
        { name: "spins", type: "bytes32" },
        { name: "gm", type: "bytes32" },
        { name: "pendingEthWei", type: "bytes32" },
        { name: "lastSlot", type: "bytes32" },
        { name: "score", type: "bytes32" },
      ],
      stateMutability: "view",
      type: "function",
    },
  ];
  const c = new ethers.Contract(contract, abi, provider);
  const bundle = await c.getEncryptedUserBundle(user);
  const relayerUrl = process.env.REACT_APP_RELAYER_URL;
  if (!relayerUrl || !signer) return { note: "Relayer or signer missing" };
  const addr = await signer.getAddress();
  if (addr.toLowerCase() !== user.toLowerCase()) return { note: "Signer is not user" };
  const domain = {
    name: "FHE Relayer",
    version: "1",
    chainId: Number(process.env.REACT_APP_CHAIN_ID || 11155111),
    verifyingContract: process.env.REACT_APP_DECRYPTION_ADDRESS,
  };
  const types = {
    UserDecryptRequestVerification: [
      { name: "ciphertext", type: "bytes32" },
      { name: "contract", type: "address" },
      { name: "user", type: "address" },
    ],
  };
  const enc = [bundle?.spins, bundle?.gm, bundle?.pendingEthWei, bundle?.lastSlot, bundle?.score];
  const dec = [];
  for (const ct of enc) {
    if (typeof ct !== "string" || !ct.startsWith("0x")) {
      dec.push(0n);
      continue;
    }
    const message = { ciphertext: ct, contract, user };
    const signature = await signer.signTypedData(domain, types, message);
    const res = await fetch(`${relayerUrl}/v1/user-decrypt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ciphertext: ct, contract, user, signature }),
    });
    if (!res.ok) {
      dec.push(0n);
      continue;
    }
    const json = await res.json();
    dec.push(BigInt(json?.value || 0));
  }
  return {
    spins: Number(dec[0] || 0n),
    gm: Number(dec[1] || 0n),
    pendingEth: Number(ethers.formatEther(dec[2] || 0n)),
    lastSlot: Number(dec[3] || 0n),
    score: Number(dec[4] || 0n),
  };
}

// GET /api/user/:addr/state?contract=0x..&useFhe=1
app.get("/api/user/:addr/state", async (req, res) => {
  try {
    const user = String(req.params.addr);
    const contract = String(req.query.contract || process.env.REACT_APP_FHEVM_CONTRACT_ADDRESS);
    const useFhe = String(req.query.useFhe || "0") === "1";
    const rpc = process.env.REACT_APP_SEPOLIA_RPC_URL;
    const provider = new ethers.JsonRpcProvider(rpc);

    const ledger = await buildUserActivityLedger(contract, user);
    const fromLedger = computeAggregatesFromLedger(ledger);

    let fhe = { note: "skipped" };
    if (useFhe && process.env.REPORT_USER_PRIVATE_KEY) {
      const pk = process.env.REPORT_USER_PRIVATE_KEY;
      const normPk = pk.startsWith("0x") ? pk : "0x" + pk;
      const signer = new ethers.Wallet(normPk, provider);
      fhe = await decryptBundleWithRelayer(contract, provider, user, signer);
    }

    const merged = {
      spins: typeof fhe?.spins === "number" && fhe.spins > 0 ? fhe.spins : fromLedger.availableSpins,
      gm: typeof fhe?.gm === "number" && fhe.gm > 0 ? fhe.gm : fromLedger.gmEstimated,
      pendingEth: typeof fhe?.pendingEth === "number" && fhe.pendingEth > 0 ? fhe.pendingEth : fromLedger.pendingEth,
      lastSlot: typeof fhe?.lastSlot === "number" && fhe.lastSlot >= 0 ? fhe.lastSlot : fromLedger.lastSlot,
      score: typeof fhe?.score === "number" ? fhe.score : undefined,
      source: typeof fhe?.spins === "number" && fhe.spins > 0 ? "fhe" : "api",
      timestamp: Date.now(),
    };

    res.json({ params: { user, contract }, ledger, aggregatesFromLedger: fromLedger, fheDecrypted: fhe, merged });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// POST /api/user/:addr/state
// Frontend sends per-field EIP-712 signatures; server forwards them to relayer.
app.post("/api/user/:addr/state", async (req, res) => {
  try {
    const user = String(req.params.addr);
    const contract = String(req.body.contract || process.env.REACT_APP_FHEVM_CONTRACT_ADDRESS);
    const rpc = process.env.REACT_APP_SEPOLIA_RPC_URL;
    const provider = new ethers.JsonRpcProvider(rpc);

    const ledger = await buildUserActivityLedger(contract, user);
    const fromLedger = computeAggregatesFromLedger(ledger);

    // Fetch bundle ciphertexts
    const abi = [
      {
        inputs: [{ name: "user", type: "address" }],
        name: "getEncryptedUserBundle",
        outputs: [
          { name: "spins", type: "bytes32" },
          { name: "gm", type: "bytes32" },
          { name: "pendingEthWei", type: "bytes32" },
          { name: "lastSlot", type: "bytes32" },
          { name: "score", type: "bytes32" },
        ],
        stateMutability: "view",
        type: "function",
      },
    ];
    const c = new ethers.Contract(contract, abi, provider);
    const bundle = await c.getEncryptedUserBundle(user);

    const relayerUrl = process.env.REACT_APP_RELAYER_URL;
    const verifyingContract = process.env.REACT_APP_DECRYPTION_ADDRESS;
    if (!relayerUrl) return res.status(400).json({ error: "Relayer URL missing" });

    const sigs = (req.body && req.body.signatures) || {};
    const fields = [
      { ct: bundle?.spins, sig: sigs.spins },
      { ct: bundle?.gm, sig: sigs.gm },
      { ct: bundle?.pendingEthWei, sig: sigs.pendingEthWei },
      { ct: bundle?.lastSlot, sig: sigs.lastSlot },
      { ct: bundle?.score, sig: sigs.score },
    ];
    const out = [];
    for (const f of fields) {
      if (!f.ct || typeof f.ct !== "string" || !f.ct.startsWith("0x") || typeof f.sig !== "string") {
        out.push(0n);
        continue;
      }
      const rq = await fetch(`${relayerUrl}/v1/user-decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ciphertext: f.ct, contract, user, signature: f.sig, verifyingContract }),
      });
      if (!rq.ok) {
        out.push(0n);
        continue;
      }
      const json = await rq.json();
      out.push(BigInt(json?.value || 0));
    }

    const fhe = {
      spins: Number(out[0] || 0n),
      gm: Number(out[1] || 0n),
      pendingEth: Number(ethers.formatEther(out[2] || 0n)),
      lastSlot: Number(out[3] || 0n),
      score: Number(out[4] || 0n),
    };

    const merged = {
      spins: fhe.spins > 0 ? fhe.spins : fromLedger.availableSpins,
      gm: fhe.gm > 0 ? fhe.gm : fromLedger.gmEstimated,
      pendingEth: fhe.pendingEth > 0 ? fhe.pendingEth : fromLedger.pendingEth,
      lastSlot: typeof fhe.lastSlot === "number" && fhe.lastSlot >= 0 ? fhe.lastSlot : fromLedger.lastSlot,
      score: typeof fhe.score === "number" ? fhe.score : undefined,
      source: fhe.spins > 0 ? "fhe" : "api",
      timestamp: Date.now(),
    };

    res.json({ params: { user, contract }, ledger, aggregatesFromLedger: fromLedger, fheDecrypted: fhe, merged });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Oracle private key (trong production nên dùng environment variable)
const ORACLE_PRIVATE_KEY =
  process.env.ORACLE_PRIVATE_KEY || "0x1234567890123456789012345678901234567890123456789012345678901234";

// Tạo oracle signer
const oracleSigner = new ethers.Wallet(ORACLE_PRIVATE_KEY);

// Endpoint để tạo claim attestation signature (under /api to match frontend proxy)
app.post("/api/claim-attestation", async (req, res) => {
  try {
    const { user, contractAddress, amountWei, nonce } = req.body;

    if (!user || !contractAddress || !amountWei || nonce === undefined) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Tạo digest theo contract logic
    const digest = ethers.solidityPackedKeccak256(
      ["address", "address", "uint256", "uint256"],
      [contractAddress, user, BigInt(amountWei), BigInt(nonce)],
    );

    // Sign digest với oracle private key
    const signature = await oracleSigner.signMessage(ethers.toBeArray(digest));

    console.log(`✅ Oracle attestation created for user ${user}, amount ${amountWei} wei, nonce ${nonce}`);

    res.json({ signature });
  } catch (error) {
    console.error("❌ Oracle attestation failed:", error);
    res.status(500).json({ error: "Failed to create attestation" });
  }
});

// Backward-compat: also serve at '/claim-attestation' when proxy strips '/api'
app.post("/claim-attestation", async (req, res) => {
  try {
    const { user, contractAddress, amountWei, nonce } = req.body;
    if (!user || !contractAddress || !amountWei || nonce === undefined) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    const digest = ethers.solidityPackedKeccak256(
      ["address", "address", "uint256", "uint256"],
      [contractAddress, user, BigInt(amountWei), BigInt(nonce)],
    );
    const signature = await oracleSigner.signMessage(ethers.toBeArray(digest));
    console.log(`✅ Oracle attestation created (compat) for user ${user}, amount ${amountWei} wei, nonce ${nonce}`);
    res.json({ signature });
  } catch (error) {
    console.error("❌ Oracle attestation failed (compat):", error);
    res.status(500).json({ error: "Failed to create attestation" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4009;
app.listen(PORT, () => {
  console.log(`🚀 Oracle server running on http://localhost:${PORT}`);
  console.log(`📡 Oracle address: ${oracleSigner.address}`);
});
