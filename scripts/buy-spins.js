/*
  Buy spins with GM on Strict contract

  Usage:
    node scripts/buy-spins.js <contractAddress> [count]

  Notes:
    - GM rate = 1000 GM / 1 ETH; cost per spin = 10 GM
    - ETH needed ≈ count * 0.01 ETH (plus small margin)
*/

/* eslint-disable no-console */
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });
const { ethers } = require("ethers");

async function main() {
  const [, , addrArg, countArg] = process.argv;
  const pk = process.env.REACT_APP_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const rpc = process.env.REACT_APP_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL;
  if (!pk || !rpc || !addrArg || !ethers.isAddress(addrArg)) {
    console.error("Usage: node scripts/buy-spins.js <contractAddress> [count]");
    process.exit(1);
  }
  const count = Math.max(1, Number(countArg || 1));
  const ethNeeded = (0.01 * count * 1.02).toFixed(5); // +2% margin

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const abi = [
    "function buyGmTokens() external payable",
    "function buySpinWithGm() external",
    "function buySpinWithGmBatch(uint64 count) external",
  ];
  const c = new ethers.Contract(addrArg, abi, wallet);

  // Fee overrides
  const overrides = {};
  try {
    const fee = await provider.getFeeData();
    const baseMax = fee?.maxFeePerGas || ethers.parseUnits("30", "gwei");
    const basePrio = fee?.maxPriorityFeePerGas || ethers.parseUnits("5", "gwei");
    overrides.maxFeePerGas = baseMax * 2n;
    overrides.maxPriorityFeePerGas = basePrio * 2n;
  } catch {}

  console.log("Account:", await wallet.getAddress());
  console.log("Contract:", addrArg);
  console.log(`Buying GM with ~${ethNeeded} ETH for ${count} spin(s)`);

  // 1) Buy GM with ETH
  const tx1 = await c.buyGmTokens({ value: ethers.parseEther(String(ethNeeded)), ...overrides });
  const rc1 = await tx1.wait();
  console.log("buyGmTokens status:", rc1.status);

  // 2) Buy spins using GM
  let rc2;
  try {
    const tx2 = await c.buySpinWithGmBatch(count, overrides);
    rc2 = await tx2.wait();
    console.log("buySpinWithGmBatch status:", rc2.status);
  } catch (e) {
    console.warn("buySpinWithGmBatch failed, trying single calls ...");
    for (let i = 0; i < count; i++) {
      // eslint-disable-next-line no-await-in-loop
      const txSingle = await c.buySpinWithGm(overrides);
      // eslint-disable-next-line no-await-in-loop
      const rcSingle = await txSingle.wait();
      console.log(`buySpinWithGm #${i + 1} status:`, rcSingle.status);
      rc2 = rcSingle;
    }
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


