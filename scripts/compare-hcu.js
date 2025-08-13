/*
  Compare HCU behavior between two contract addresses by attempting spin

  Usage:
    node scripts/compare-hcu.js <oldAddress> <newAddress>

  Env required:
    REACT_APP_PRIVATE_KEY  (hex private key of test wallet)
    REACT_APP_SEPOLIA_RPC_URL  (Sepolia RPC URL)
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

async function attemptSpin(contract, provider) {
  const overrides = {};
  try {
    const est = await contract.spin.estimateGas();
    const buffered = est * 2n;
    const cap = 3_500_000n;
    overrides.gasLimit = buffered > cap ? cap : buffered;
  } catch {
    overrides.gasLimit = 3_000_000n;
  }
  try {
    const fee = await provider.getFeeData();
    if (fee?.maxFeePerGas) overrides.maxFeePerGas = fee.maxFeePerGas;
    if (fee?.maxPriorityFeePerGas) overrides.maxPriorityFeePerGas = fee.maxPriorityFeePerGas;
  } catch {}

  try {
    const tx = await contract.spin(overrides);
    const rc = await tx.wait();
    return { ok: rc.status === 1, gasUsed: rc.gasUsed?.toString?.() || null, logs: rc.logs?.length || 0 };
  } catch (e) {
    if (isLikelyHcuLimit(e)) return { ok: false, hcu: true };
    return { ok: false, err: e?.shortMessage || e?.reason || e?.message || String(e) };
  }
}

async function testAddress(address, wallet, provider, rounds = 3) {
  const abi = [
    "function spin() external",
    "event SpinOutcome(address indexed user, uint8 slot, uint256 prizeWei, uint64 gmDelta)",
  ];
  const c = new ethers.Contract(address, abi, wallet);
  const results = [];
  for (let i = 0; i < rounds; i++) {
    // eslint-disable-next-line no-await-in-loop
    const r = await attemptSpin(c, provider);
    results.push(r);
    if (r.ok) break;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((res) => setTimeout(res, 5000));
  }
  const summary = {
    address,
    attempts: results.length,
    successes: results.filter((r) => r.ok).length,
    hcuLikely: results.filter((r) => r.hcu).length,
    last: results[results.length - 1] || null,
  };
  return summary;
}

(async function main() {
  const [, , oldAddr, newAddr] = process.argv;
  const pk = process.env.REACT_APP_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const rpc = process.env.REACT_APP_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL;
  if (!pk || !rpc) {
    console.error("Missing env: REACT_APP_PRIVATE_KEY and/or REACT_APP_SEPOLIA_RPC_URL");
    process.exit(1);
  }
  if (!ethers.isAddress(oldAddr) || !ethers.isAddress(newAddr)) {
    console.error("Usage: node scripts/compare-hcu.js <oldAddress> <newAddress>");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);

  console.log("Testing old:", oldAddr);
  const oldSummary = await testAddress(oldAddr, wallet, provider);
  console.log("Testing new:", newAddr);
  const newSummary = await testAddress(newAddr, wallet, provider);

  console.log("\n=== Comparison ===");
  console.table([
    { label: "old", ...oldSummary },
    { label: "new", ...newSummary },
  ]);
})();
