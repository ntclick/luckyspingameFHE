/*
  Spin test using spinLite() then settlePrize(slot)

  Usage:
    node scripts/spin-lite-and-settle.js <contractAddress>

  Env:
    REACT_APP_PRIVATE_KEY, REACT_APP_SEPOLIA_RPC_URL
*/

/* eslint-disable no-console */
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });
const { ethers } = require("ethers");

async function main() {
  const [, , addrArg] = process.argv;
  const pk = process.env.REACT_APP_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const rpc = process.env.REACT_APP_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL;
  if (!pk || !rpc || !addrArg || !ethers.isAddress(addrArg)) {
    console.error("Usage: node scripts/spin-lite-and-settle.js <contractAddress>");
    process.exit(1);
  }
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const abi = [
    "function spinLite() external",
    "function settlePrize(uint8 slot) external",
    "event SpinOutcome(address indexed user, uint8 slot, uint256 prizeWei, uint64 gmDelta)",
  ];
  const c = new ethers.Contract(addrArg, abi, wallet);

  // fee/gas overrides
  const overrides = {};
  try {
    const fee = await provider.getFeeData();
    const baseMax = fee?.maxFeePerGas || ethers.parseUnits("30", "gwei");
    const basePrio = fee?.maxPriorityFeePerGas || ethers.parseUnits("5", "gwei");
    overrides.maxFeePerGas = baseMax * 2n;
    overrides.maxPriorityFeePerGas = basePrio * 2n;
  } catch {}
  try {
    const est = await c.spinLite.estimateGas();
    const cap = 3_500_000n;
    overrides.gasLimit = est * 2n > cap ? cap : est * 2n;
  } catch {
    overrides.gasLimit = 2_000_000n;
  }

  console.log("Account:", await wallet.getAddress());
  console.log("Contract:", addrArg);

  console.log("\n➡️  Calling spinLite() ...");
  const tx = await c.spinLite(overrides);
  const rc = await tx.wait();
  console.log("spinLite status:", rc.status, "logs:", rc.logs?.length || 0);

  const topic = ethers.id("SpinOutcome(address,uint8,uint256,uint64)");
  const log = rc.logs.find((l) => l.topics?.[0] === topic);
  if (!log) {
    console.log("No SpinOutcome log found.");
    return;
  }
  const iface = new ethers.Interface(abi);
  const parsed = iface.parseLog(log);
  const slot = Number(parsed.args.slot);
  const gmDelta = Number(parsed.args.gmDelta);
  console.log("Outcome:", { slot, gmDelta });

  if (slot === 0 || slot === 1 || slot === 5 || slot === 6 || slot === 7) {
    console.log("\n➡️  Settling prize for slot", slot, "...");
    const tx2 = await c.settlePrize(slot, overrides);
    const rc2 = await tx2.wait();
    console.log("settlePrize status:", rc2.status);
  } else {
    console.log("No prize to settle for slot", slot);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
