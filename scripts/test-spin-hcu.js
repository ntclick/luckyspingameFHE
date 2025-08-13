/*
  Quick spin HCU tester

  Usage:
    node scripts/test-spin-hcu.js <contractAddress?>

  Env required:
    REACT_APP_PRIVATE_KEY  (hex private key of test wallet)
    REACT_APP_SEPOLIA_RPC_URL  (Sepolia RPC URL)
*/

/* eslint-disable no-console */
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });
dotenv.config({ path: "frontend-fhe-spin/.env" });
dotenv.config({ path: "frontend-fhe-spin/.env.local" });

const { ethers } = require("ethers");

async function main() {
  const [, , addrArg] = process.argv;
  const pk = process.env.REACT_APP_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const rpc = process.env.REACT_APP_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL;
  const contractAddress = addrArg || process.env.REACT_APP_FHEVM_CONTRACT_ADDRESS;

  if (!pk || !rpc) {
    console.error("Missing env: REACT_APP_PRIVATE_KEY and/or REACT_APP_SEPOLIA_RPC_URL");
    process.exit(1);
  }
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    console.error("Provide a valid contract address (arg or REACT_APP_FHEVM_CONTRACT_ADDRESS)");
    process.exit(1);
  }

  console.log("RPC:", rpc.slice(0, 32) + "...");
  console.log("Contract:", contractAddress);

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);

  const abi = [
    "function spin() external",
    "event SpinOutcome(address indexed user, uint8 slot, uint256 prizeWei, uint64 gmDelta)",
  ];
  const c = new ethers.Contract(contractAddress, abi, wallet);

  // Helper to classify revert-without-logs as HCU/ACL budget condition
  function isLikelyHcuLimit(err) {
    try {
      const r = err?.receipt;
      return r && r.status === 0 && (!Array.isArray(r.logs) || r.logs.length === 0);
    } catch {
      return false;
    }
  }

  // Single attempt
  async function attemptSpin() {
    console.log("\n=== Attempt spin ===");
    // Build gas overrides similar to frontend
    const overrides = {};
    try {
      const est = await c.spin.estimateGas();
      const buffered = (est * 2n);
      const cap = 3_500_000n;
      overrides.gasLimit = buffered > cap ? cap : buffered;
    } catch {
      overrides.gasLimit = 3_000_000n;
    }
    try {
      const fee = await provider.getFeeData();
      // Aggressive fee bump to test inclusion vs revert
      const baseMax = fee?.maxFeePerGas || ethers.parseUnits("30", "gwei");
      const basePrio = fee?.maxPriorityFeePerGas || ethers.parseUnits("5", "gwei");
      overrides.maxFeePerGas = baseMax * 2n; // ~2x bump
      overrides.maxPriorityFeePerGas = basePrio * 2n; // ~2x bump
    } catch {
      overrides.gasPrice = ethers.parseUnits("50", "gwei");
    }

    try {
      const tx = await c.spin(overrides);
      console.log("tx sent:", tx.hash);
      const rc = await tx.wait();
      console.log("mined: status=", rc.status, "gasUsed=", rc.gasUsed?.toString?.());
      if (rc.logs?.length) {
        console.log("logs:", rc.logs.length);
      } else {
        console.log("no logs emitted");
      }
      return { ok: rc.status === 1, receipt: rc };
    } catch (e) {
      if (isLikelyHcuLimit(e)) {
        console.error("HCU_LIMIT_EXCEEDED (likely): revert with empty logs");
      } else {
        console.error("spin failed:", e?.shortMessage || e?.reason || e?.message || e);
      }
      return { ok: false, error: e };
    }
  }

  // Run 3 spaced attempts to see if HCU recovers
  const results = [];
  for (let i = 0; i < 3; i++) {
    // eslint-disable-next-line no-await-in-loop
    const r = await attemptSpin();
    results.push(r);
    if (r.ok) break;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((res) => setTimeout(res, 5000));
  }
  const summary = results.map((r, i) => ({ attempt: i + 1, ok: r.ok }));
  console.log("\nSummary:", summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


