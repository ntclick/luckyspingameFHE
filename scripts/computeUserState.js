/*
 Usage:
   node scripts/computeUserState.js <userAddress> [contractAddress]

 Description:
   Backend utility that:
   - Fetches and categorizes all interactions from Etherscan logs (API-first)
   - Computes derived aggregates (availableSpins, gmEstimated, pendingEth, lastSlot)
   - Optionally reads encrypted user bundle and attempts FHE decryption using @zama-fhe/relayer-sdk
     if PRIVATE_KEY (matching the user) and relayer config are provided

 Environment variables (from .env):
   REACT_APP_ETHERSCAN_API_KEY
   REACT_APP_SEPOLIA_RPC_URL
   REACT_APP_FHEVM_CONTRACT_ADDRESS (fallback if not passed as arg)
   REACT_APP_RELAYER_URL
   REACT_APP_CHAIN_ID
   REACT_APP_ACL_CONTRACT
   REACT_APP_KMS_VERIFIER_CONTRACT
   REACT_APP_INPUT_VERIFIER_CONTRACT
   REACT_APP_DECRYPTION_ADDRESS
   REACT_APP_INPUT_VERIFICATION_ADDRESS
   REACT_APP_PRIVATE_KEY (optional; must be the USER's key to authorize userDecrypt)
*/

require("dotenv").config();
const { ethers } = require("ethers");

const ETHERSCAN_BASE = "https://api-sepolia.etherscan.io/api";
const SPIN_OUTCOME_SIG = "SpinOutcome(address,uint8,uint256,uint64)";
const SPIN_BOUGHT_SIG = "SpinBoughtWithGm(address,uint64)";
const CHECKIN_SIG = "CheckInCompleted(address,uint256)";
const GM_BOUGHT_SIG = "GmTokensBought(address,uint256)";
const GM_BOUGHT_FHE_SIG = "GmTokensBoughtFHE(address)";

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

async function tryDecryptBundle(contract, provider, user, signer) {
  try {
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
    if (!relayerUrl || !signer) {
      return { note: "Relayer or signer missing; decryption skipped" };
    }

    // Strategy A: use relayer SDK if available (more accurate EIP-712 flow)
    let usedSdk = false;
    const dec = [];
    try {
      const candidates = [
        "@zama-fhe/relayer-sdk",
        "@zama-fhe/relayer-sdk/web.js",
        "@zama-fhe/relayer-sdk/web",
        "@zama-fhe/relayer-sdk/dist/web.js",
      ];
      let sdkMod = null;
      for (const mod of candidates) {
        try {
          sdkMod = require(mod);
          break;
        } catch {}
      }
      if (!sdkMod) {
        try {
          sdkMod = await import("@zama-fhe/relayer-sdk");
        } catch {}
      }
      const createInstance =
        (sdkMod && sdkMod.createInstance) || (sdkMod && sdkMod.default && sdkMod.default.createInstance);
      if (createInstance) {
        const instanceConfig = {
          aclContractAddress: process.env.REACT_APP_ACL_CONTRACT,
          kmsContractAddress: process.env.REACT_APP_KMS_VERIFIER_CONTRACT,
          inputVerifierContractAddress: process.env.REACT_APP_INPUT_VERIFIER_CONTRACT,
          verifyingContractAddressDecryption: process.env.REACT_APP_DECRYPTION_ADDRESS,
          verifyingContractAddressInputVerification: process.env.REACT_APP_INPUT_VERIFICATION_ADDRESS,
          chainId: Number(process.env.REACT_APP_CHAIN_ID || 11155111),
          gatewayChainId: 55815,
          network: process.env.REACT_APP_SEPOLIA_RPC_URL,
          relayerUrl,
        };
        const instance = await createInstance(instanceConfig);
        const enc = [bundle?.spins, bundle?.gm, bundle?.pendingEthWei, bundle?.lastSlot, bundle?.score];
        for (const ct of enc) {
          if (typeof ct !== "string" || !ct.startsWith("0x")) {
            dec.push(0n);
            continue;
          }
          const v = await instance.userDecrypt(ct, signer);
          dec.push(BigInt(v || 0));
        }
        usedSdk = true;
      }
    } catch {}

    // Strategy B: direct REST fallback if SDK not used
    if (!usedSdk) {
      const addr = await signer.getAddress();
      if (addr.toLowerCase() !== user.toLowerCase()) {
        return { note: "Signer is not the user; cannot authorize userDecrypt" };
      }
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
    }
    return {
      spins: Number(dec[0] || 0n),
      gm: Number(dec[1] || 0n),
      pendingEth: Number(ethers.formatEther(dec[2] || 0n)),
      lastSlot: Number(dec[3] || 0n),
      score: Number(dec[4] || 0n),
    };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
}

async function main() {
  const user = process.argv[2];
  const contract = process.argv[3] || process.env.REACT_APP_FHEVM_CONTRACT_ADDRESS;
  if (!user || !contract) {
    console.log("Usage: node scripts/computeUserState.js <userAddress> [contractAddress]");
    process.exit(1);
  }
  const rpc = process.env.REACT_APP_SEPOLIA_RPC_URL;
  const provider = new ethers.JsonRpcProvider(rpc);

  const ledger = await buildUserActivityLedger(contract, user);
  const fromLedger = computeAggregatesFromLedger(ledger);

  // Optional FHE decrypt if we have the user's private key
  let signer = null;
  if (process.env.REACT_APP_PRIVATE_KEY) {
    try {
      const pk = process.env.REACT_APP_PRIVATE_KEY.startsWith("0x")
        ? process.env.REACT_APP_PRIVATE_KEY
        : "0x" + process.env.REACT_APP_PRIVATE_KEY;
      signer = new ethers.Wallet(pk, provider);
    } catch {}
  }
  const fhe = await tryDecryptBundle(contract, provider, user, signer);

  // Merge policy: prefer FHE when available and non-zero
  const final = {
    spins: typeof fhe?.spins === "number" && fhe.spins > 0 ? fhe.spins : fromLedger.availableSpins,
    gm: typeof fhe?.gm === "number" && fhe.gm > 0 ? fhe.gm : fromLedger.gmEstimated,
    pendingEth: typeof fhe?.pendingEth === "number" && fhe.pendingEth > 0 ? fhe.pendingEth : fromLedger.pendingEth,
    lastSlot: typeof fhe?.lastSlot === "number" && fhe.lastSlot >= 0 ? fhe.lastSlot : fromLedger.lastSlot,
    score: typeof fhe?.score === "number" ? fhe.score : undefined,
  };

  const stringify = (obj) => JSON.stringify(obj, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
  console.log(
    stringify({
      params: { user, contract },
      ledger,
      aggregatesFromLedger: fromLedger,
      fheDecrypted: fhe,
      mergedFinal: final,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
