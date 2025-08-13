/*
  Fund spins then spin (test flow):

  Steps:
    1) Try dailyGm() to add +1 spin
    2) If still no spin, buy GM with ETH (0.02 ETH) then buySpinWithGmBatch(1)
    3) Call spin() and report result (or HCU-likely revert)

  Usage:
    node scripts/fund-and-spin.js <contractAddress>

  Env:
    REACT_APP_PRIVATE_KEY, REACT_APP_SEPOLIA_RPC_URL
*/

/* eslint-disable no-console */
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });
const { ethers } = require("ethers");

function isLikelyHcuLimit(err) {
  try {
    const r = err?.receipt;
    return r && r.status === 0 && (!Array.isArray(r.logs) || r.logs.length === 0);
  } catch {
    return false;
  }
}

async function main() {
  const [, , addrArg] = process.argv;
  const pk = process.env.REACT_APP_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const rpc = process.env.REACT_APP_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL;
  if (!pk || !rpc || !addrArg || !ethers.isAddress(addrArg)) {
    console.error(
      "Usage: node scripts/fund-and-spin.js <contractAddress>  (requires REACT_APP_PRIVATE_KEY, REACT_APP_SEPOLIA_RPC_URL)",
    );
    process.exit(1);
  }
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const abi = [
    "function dailyGm() external",
    "function buyGmTokens() external payable",
    "function buySpinWithGm() external",
    "function buySpinWithGmBatch(uint64 count) external",
    "function spin() external",
  ];
  const c = new ethers.Contract(addrArg, abi, wallet);

  // Helper to send tx with decent gas/fee
  async function withOverrides(fn, args = []) {
    const overrides = {};
    try {
      const fee = await provider.getFeeData();
      const baseMax = fee?.maxFeePerGas || ethers.parseUnits("30", "gwei");
      const basePrio = fee?.maxPriorityFeePerGas || ethers.parseUnits("5", "gwei");
      overrides.maxFeePerGas = baseMax * 2n;
      overrides.maxPriorityFeePerGas = basePrio * 2n;
    } catch {}
    try {
      const est = await c[fn].estimateGas(...args);
      const cap = 3_500_000n;
      overrides.gasLimit = est * 2n > cap ? cap : est * 2n;
    } catch {}
    const tx = await c[fn](...args, overrides);
    return await tx.wait();
  }

  console.log("Account:", await wallet.getAddress());
  console.log("Contract:", addrArg);

  // 1) Try daily check-in
  try {
    console.log("\n➡️  Calling dailyGm() ...");
    const rc = await withOverrides("dailyGm", []);
    console.log("dailyGm status:", rc.status);
  } catch (e) {
    console.warn("dailyGm failed:", e?.shortMessage || e?.reason || e?.message || String(e));
  }

  // 2) Buy GM => Buy Spin (fallback path)
  try {
    console.log("\n➡️  Buying GM with 0.02 ETH (to ensure >= 10 GM) ...");
    const tx = await c.buyGmTokens({ value: ethers.parseEther("0.02") });
    const rc = await tx.wait();
    console.log("buyGmTokens status:", rc.status);
  } catch (e) {
    console.warn("buyGmTokens failed (continuing):", e?.shortMessage || e?.reason || e?.message || String(e));
  }

  // Try batch first, then single
  try {
    console.log("➡️  buySpinWithGmBatch(1) ...");
    const rc = await withOverrides("buySpinWithGmBatch", [1]);
    console.log("buySpinWithGmBatch status:", rc.status);
  } catch (e) {
    console.warn("buySpinWithGmBatch failed, trying single:", e?.shortMessage || e?.reason || e?.message || String(e));
    try {
      const rc2 = await withOverrides("buySpinWithGm", []);
      console.log("buySpinWithGm status:", rc2.status);
    } catch (e2) {
      console.warn("buySpinWithGm failed:", e2?.shortMessage || e2?.reason || e2?.message || String(e2));
    }
  }

  // 3) Spin
  try {
    console.log("\n➡️  Spinning ...");
    const overrides = {};
    try {
      const fee = await provider.getFeeData();
      const baseMax = fee?.maxFeePerGas || ethers.parseUnits("30", "gwei");
      const basePrio = fee?.maxPriorityFeePerGas || ethers.parseUnits("5", "gwei");
      overrides.maxFeePerGas = baseMax * 2n;
      overrides.maxPriorityFeePerGas = basePrio * 2n;
    } catch {}
    try {
      const est = await c.spin.estimateGas();
      const cap = 3_500_000n;
      overrides.gasLimit = est * 2n > cap ? cap : est * 2n;
    } catch {
      overrides.gasLimit = 3_000_000n;
    }
    const tx = await c.spin(overrides);
    const rc = await tx.wait();
    console.log("spin status:", rc.status, "gasUsed:", rc.gasUsed?.toString?.());
    console.log("logs:", rc.logs?.length || 0);
  } catch (e) {
    if (isLikelyHcuLimit(e)) console.error("spin: HCU_LIMIT_EXCEEDED (likely)");
    else console.error("spin failed:", e?.shortMessage || e?.reason || e?.message || String(e));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
