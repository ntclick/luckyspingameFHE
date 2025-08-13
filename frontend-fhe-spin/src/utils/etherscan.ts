import { ethers } from "ethers";

const ETHERSCAN_BASE = "https://api-sepolia.etherscan.io/api";
const SPIN_OUTCOME_SIG = "SpinOutcome(address,uint8,uint256,uint64)";
const SPIN_BOUGHT_SIG = "SpinBoughtWithGm(address,uint64)";
const CHECKIN_SIG = "CheckInCompleted(address,uint256)";
const GM_BOUGHT_SIG = "GmTokensBought(address,uint256)";
const GM_BOUGHT_FHE_SIG = "GmTokensBoughtFHE(address)";

function padTopicAddress(addr: string): string {
  const clean = addr.toLowerCase().replace(/^0x/, "");
  return "0x" + "0".repeat(24) + clean; // 12 bytes zero + 20 bytes addr
}

export async function fetchSpinOutcomesEtherscan(contract: string, user: string) {
  try {
    const apiKey = process.env.REACT_APP_ETHERSCAN_API_KEY;
    if (!apiKey) throw new Error("ETHERSCAN API key missing");
    const topic0 = ethers.id(SPIN_OUTCOME_SIG);
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
    if (json?.status !== "1" || !Array.isArray(json?.result)) {
      return { pendingEth: 0, totalGm: 0, lastSlot: null };
    }
    let pendingEthWei = 0n;
    let totalGm = 0;
    let lastSlot: number | null = null;
    for (const log of json.result) {
      const data: string = log?.data || "0x";
      // data layout: slot (uint8 padded to 32), prizeWei (uint256), gmDelta (uint64)
      if (data.length < 2 + 64 * 3) continue;
      const slotHex = data.slice(2, 2 + 64);
      const prizeWeiHex = data.slice(2 + 64, 2 + 64 * 2);
      const gmDeltaHex = data.slice(2 + 64 * 2, 2 + 64 * 3);
      const slot = Number(BigInt("0x" + slotHex));
      const prizeWei = BigInt("0x" + prizeWeiHex);
      const gmDelta = Number(BigInt("0x" + gmDeltaHex));
      lastSlot = Number.isFinite(slot) ? slot : lastSlot;
      // Our contract emits prizeWei=0 for privacy; derive by slot
      if (slot === 0) pendingEthWei += ethers.parseEther("0.1");
      else if (slot === 1) pendingEthWei += ethers.parseEther("0.01");
      if (Number.isFinite(gmDelta)) totalGm += gmDelta;
      if (prizeWei > 0n) pendingEthWei += prizeWei; // in case contract sets non-zero later
    }
    const pendingEth = Number(ethers.formatEther(pendingEthWei));
    return { pendingEth, totalGm, lastSlot };
  } catch {
    return { pendingEth: 0, totalGm: 0, lastSlot: null };
  }
}

async function getLogsByTopic(contract: string, topic: string, user: string) {
  const apiKey = process.env.REACT_APP_ETHERSCAN_API_KEY as string;
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
  if (json?.status !== "1" || !Array.isArray(json?.result)) return [] as any[];
  return json.result as any[];
}

export async function fetchUserAggregatesFromEvents(
  contract: string,
  user: string,
): Promise<{
  availableSpins: number;
  gmEstimated: number;
  pendingEth: number;
  lastSlot: number | null;
}> {
  try {
    const [spinLogs, buySpinsLogs, checkinLogs, gmBuyLogs, gmBuyFheLogs] = await Promise.all([
      getLogsByTopic(contract, SPIN_OUTCOME_SIG, user),
      getLogsByTopic(contract, SPIN_BOUGHT_SIG, user),
      getLogsByTopic(contract, CHECKIN_SIG, user),
      getLogsByTopic(contract, GM_BOUGHT_SIG, user),
      getLogsByTopic(contract, GM_BOUGHT_FHE_SIG, user),
    ]);

    // Spins and rewards
    let pendingEthWei = 0n;
    let gmFromPrizes = 0;
    let lastSlot: number | null = null;
    for (const log of spinLogs) {
      const data: string = log?.data || "0x";
      if (data.length < 2 + 64 * 3) continue;
      const slotHex = data.slice(2, 2 + 64);
      const prizeWeiHex = data.slice(2 + 64, 2 + 64 * 2);
      const gmDeltaHex = data.slice(2 + 64 * 2, 2 + 64 * 3);
      const slot = Number(BigInt("0x" + slotHex));
      const prizeWei = BigInt("0x" + prizeWeiHex);
      const gmDelta = Number(BigInt("0x" + gmDeltaHex));
      lastSlot = Number.isFinite(slot) ? slot : lastSlot;
      if (slot === 0) pendingEthWei += ethers.parseEther("0.1");
      else if (slot === 1) pendingEthWei += ethers.parseEther("0.01");
      if (Number.isFinite(gmDelta)) gmFromPrizes += gmDelta;
      if (prizeWei > 0n) pendingEthWei += prizeWei;
    }

    // Spins bought with GM (counts)
    let spinsBought = 0;
    for (const log of buySpinsLogs) {
      const data: string = log?.data || "0x";
      if (data.length < 2 + 64) continue;
      const cntHex = data.slice(2 + 64 - 64, 2 + 64); // single uint64 padded
      const count = Number(BigInt("0x" + cntHex));
      if (Number.isFinite(count)) spinsBought += count;
    }

    // Daily check-ins (each adds +1 spin)
    const checkins = Array.isArray(checkinLogs) ? checkinLogs.length : 0;

    // Spins executed
    const spinsDone = Array.isArray(spinLogs) ? spinLogs.length : 0;

    // GM bought publicly (ETH path only)
    let gmPublic = 0;
    for (const log of gmBuyLogs) {
      const data: string = log?.data || "0x";
      if (data.length < 2 + 64) continue;
      const amountHex = data.slice(2, 2 + 64);
      const amt = Number(BigInt("0x" + amountHex));
      if (Number.isFinite(amt)) gmPublic += amt;
    }
    // FHE buys exist but amount is confidential → cannot include

    const availableSpins = Math.max(0, spinsBought + checkins - spinsDone);
    const gmEstimated = Math.max(0, gmPublic + gmFromPrizes - 10 * spinsBought);
    const pendingEth = Number(ethers.formatEther(pendingEthWei));
    return { availableSpins, gmEstimated, pendingEth, lastSlot };
  } catch {
    return { availableSpins: 0, gmEstimated: 0, pendingEth: 0, lastSlot: null };
  }
}
