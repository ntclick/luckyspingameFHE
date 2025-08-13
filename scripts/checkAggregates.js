/*
  Quick aggregator using Etherscan logs to compute:
  - availableSpins
  - gmEstimated

  Usage:
    node scripts/checkAggregates.js <userAddress> [contractAddress]

  Defaults:
    contractAddress defaults to the one in frontend-fhe-spin/env.local if not provided,
    or to the current known deployed address below.
*/

/* eslint-disable no-console */

const { createHash } = require("crypto");

// Simple keccak256 of a string, compatible with ethers.id
function keccak256(input) {
  // Node doesn't have native keccak; use ethers-style topic by delegating to web3 libs is heavy.
  // Instead, rely on precomputed signatures if needed. For flexibility, we fall back to require('ethers') if installed.
  try {
    // eslint-disable-next-line global-require
    const { id } = require("ethers");
    return id(input);
  } catch {
    // Fallback (not keccak) — not used because we always expect ethers to be present in this workspace
    const h = createHash("sha256");
    h.update(input);
    return `0x${h.digest("hex")}`;
  }
}

async function main() {
  const [, , userArg, contractArg] = process.argv;
  if (!userArg) {
    console.error("Usage: node scripts/checkAggregates.js <userAddress> [contractAddress]");
    process.exit(1);
  }
  const user = userArg.toLowerCase();

  // Load env helpers (.env, .env.local in root and frontend)
  function tryLoadEnvFile(path) {
    try {
      const fs = require("fs");
      if (fs.existsSync(path)) {
        const txt = fs.readFileSync(path, "utf-8");
        txt
          .split(/\r?\n/)
          .filter((l) => /\w+=/.test(l) && !/^\s*#/.test(l))
          .forEach((line) => {
            const idx = line.indexOf("=");
            if (idx > 0) {
              const k = line.slice(0, idx).trim();
              const v = line
                .slice(idx + 1)
                .trim()
                .replace(/^"|"$/g, "");
              if (!process.env[k]) process.env[k] = v;
            }
          });
      }
    } catch {}
  }

  tryLoadEnvFile(".env");
  tryLoadEnvFile(".env.local");
  tryLoadEnvFile("frontend-fhe-spin/.env");
  tryLoadEnvFile("frontend-fhe-spin/.env.local");
  tryLoadEnvFile("frontend-fhe-spin/env.local");

  // Load contract address
  let contract = contractArg;
  if (!contract) {
    contract = process.env.REACT_APP_FHEVM_CONTRACT_ADDRESS || process.env.FHEVM_CONTRACT_ADDRESS || contract;
  }
  if (!contract) {
    contract = "0xd2c268af9Ba073fb99a3fC7D9dE5108b94902a0B";
  }

  const ETHERSCAN_BASE = "https://api-sepolia.etherscan.io/api";
  const API_KEY =
    process.env.ETHERSCAN_API_KEY || process.env.REACT_APP_ETHERSCAN_API_KEY || "SMYU9ZMV9DB55ZAFPW5JKN56S52RVBIWX6";

  const SPIN_OUTCOME_SIG = "SpinOutcome(address,uint8,uint256,uint64)";
  const SPIN_BOUGHT_SIG = "SpinBoughtWithGm(address,uint64)";
  const CHECKIN_SIG = "CheckInCompleted(address,uint256)";
  const GM_BOUGHT_SIG = "GmTokensBought(address,uint256)";

  function padTopicAddress(addr) {
    const clean = addr.toLowerCase().replace(/^0x/, "");
    return "0x" + "0".repeat(24) + clean;
  }

  async function getLogsByTopic(topicSig) {
    const topic0 = keccak256(topicSig);
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
      apikey: API_KEY,
    });
    const url = `${ETHERSCAN_BASE}?${params.toString()}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json?.status !== "1" || !Array.isArray(json?.result)) return [];
    return json.result;
  }

  const [spinLogs, buySpinsLogs, checkinLogs, gmBuyLogs] = await Promise.all([
    getLogsByTopic(SPIN_OUTCOME_SIG),
    getLogsByTopic(SPIN_BOUGHT_SIG),
    getLogsByTopic(CHECKIN_SIG),
    getLogsByTopic(GM_BOUGHT_SIG),
  ]);

  // Parse
  let gmFromPrizes = 0n;
  let pendingEthWei = 0n;
  let lastSlotNum = null;
  for (const log of spinLogs) {
    const data = String(log?.data || "0x");
    if (data.length < 2 + 64 * 3) continue;
    const slotHex = data.slice(2, 2 + 64);
    const prizeWeiHex = data.slice(2 + 64, 2 + 64 * 2);
    const gmDeltaHex = data.slice(2 + 64 * 2, 2 + 64 * 3);
    const slot = Number(BigInt("0x" + slotHex));
    const prizeWei = BigInt("0x" + prizeWeiHex);
    const gmDelta = BigInt("0x" + gmDeltaHex);
    lastSlotNum = Number.isFinite(slot) ? slot : lastSlotNum;
    if (slot === 0)
      pendingEthWei += 10_0000000000000000n; // 0.1 ETH
    else if (slot === 1) pendingEthWei += 10_00000000000000n; // 0.01 ETH
    gmFromPrizes += gmDelta;
    if (prizeWei > 0n) pendingEthWei += prizeWei;
  }

  let spinsBought = 0n;
  for (const log of buySpinsLogs) {
    const data = String(log?.data || "0x");
    if (data.length < 2 + 64) continue;
    const cntHex = data.slice(2 + 64 - 64, 2 + 64);
    const count = BigInt("0x" + cntHex);
    spinsBought += count;
  }

  const checkins = BigInt(Array.isArray(checkinLogs) ? checkinLogs.length : 0);
  const spinsDone = BigInt(Array.isArray(spinLogs) ? spinLogs.length : 0);

  let gmPublic = 0n;
  for (const log of gmBuyLogs) {
    const data = String(log?.data || "0x");
    if (data.length < 2 + 64) continue;
    const amountHex = data.slice(2, 2 + 64);
    const amt = BigInt("0x" + amountHex);
    gmPublic += amt;
  }

  const availableSpins = spinsBought + checkins - spinsDone;
  const gmEstimated = gmPublic + gmFromPrizes - 10n * spinsBought; // cost: 10 GM per spin

  function formatEth(wei) {
    const s = wei.toString();
    const pad = s.padStart(19, "0");
    const whole = pad.slice(0, -18);
    const frac = pad.slice(-18).replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : whole;
  }

  const result = {
    contract,
    user,
    availableSpins: Number(availableSpins < 0n ? 0n : availableSpins),
    gmEstimated: Number(gmEstimated < 0n ? 0n : gmEstimated),
    pendingEth: formatEth(pendingEthWei),
    lastSlot: lastSlotNum,
    _debug: {
      spinsDone: Number(spinsDone),
      spinsBought: Number(spinsBought),
      checkins: Number(checkins),
      gmPublic: Number(gmPublic),
      gmFromPrizes: Number(gmFromPrizes),
      gmEstimatedFormula: "gmPublic + gmFromPrizes - 10 * spinsBought",
      spinLogs: spinLogs.slice(-3).map((l) => ({ tx: l.transactionHash, block: l.blockNumber })),
      buySpinsLogs: buySpinsLogs.slice(-3).map((l) => ({ tx: l.transactionHash, block: l.blockNumber })),
      checkinLogs: checkinLogs.slice(-3).map((l) => ({ tx: l.transactionHash, block: l.blockNumber })),
      gmBuyLogs: gmBuyLogs.slice(-3).map((l) => ({ tx: l.transactionHash, block: l.blockNumber })),
    },
  };
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
