/*
 Script kiểm thử logic LuckySpinFHE_Simple trên Sepolia
 Chạy:
   npx hardhat run scripts/test_logic.ts --network sepolia

 Yêu cầu:
 - PRIVATE KEY trên network sepolia đã cấu hình trong hardhat.config.ts và có ETH testnet
*/

import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

// Địa chỉ contract (fallback). Ưu tiên lấy từ deployments/sepolia/LuckySpinFHE_Simple.json nếu có
const FALLBACK_CONTRACT_ADDRESS = "0x0A12d70f28d9fFE87f9D437B4ECdF530febB867a";

// ABI tối thiểu cần dùng cho test
const ABI = [
  // core actions
  { inputs: [], name: "spin", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "claimETH", outputs: [], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [
      { internalType: "externalEuint64", name: "encryptedAmount", type: "bytes32" },
      { internalType: "bytes", name: "proof", type: "bytes" },
    ],
    name: "buyGmTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "externalEuint64", name: "encryptedOne", type: "bytes32" },
      { internalType: "bytes", name: "proof", type: "bytes" },
    ],
    name: "buySpinWithGm",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // views
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserSpins",
    outputs: [{ internalType: "euint64", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserGmBalance",
    outputs: [{ internalType: "euint64", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getClaimableEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "canGmToday",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getTimeUntilNextGm",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // events (để decode nếu cần)
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "string", name: "result", type: "string" },
    ],
    name: "SpinCompleted",
    type: "event",
  },
];

function loadDeployedAddress(): string {
  try {
    const fp = path.join(__dirname, "../deployments/sepolia/LuckySpinFHE_Simple.json");
    if (fs.existsSync(fp)) {
      const json = JSON.parse(fs.readFileSync(fp, "utf-8"));
      if (json.address && typeof json.address === "string") return json.address;
    }
  } catch {}
  return FALLBACK_CONTRACT_ADDRESS;
}

async function main() {
  console.log("=== Test logic LuckySpinFHE_Simple ===");
  console.log("Network:", network.name);

  const [signer] = await ethers.getSigners();
  const addr = await signer.getAddress();
  const bal = await signer.provider!.getBalance(addr);
  console.log("Signer:", addr);
  console.log("Balance:", ethers.formatEther(bal), "ETH");

  const contractAddr = loadDeployedAddress();
  console.log("Contract:", contractAddr);

  const contract = new ethers.Contract(contractAddr, ABI, signer);

  const user = addr;
  const zeroBytes32 = "0x" + "00".repeat(32);
  const emptyBytes = "0x";

  // Helpers
  const readState = async (label = "state") => {
    console.log(`\n[${label}]`);
    // Encrypted views may revert on some RPCs; wrap in try/catch
    try {
      const spins = await contract.getUserSpins(user);
      console.log("spins (ciphertext):", spins);
    } catch (e: any) {
      console.log("spins read reverted:", e?.reason || e?.shortMessage || e?.message || e);
    }
    try {
      const gm = await contract.getUserGmBalance(user);
      console.log("gm (ciphertext):", gm);
    } catch (e: any) {
      console.log("gm read reverted:", e?.reason || e?.shortMessage || e?.message || e);
    }
    try {
      const claimWei = await contract.getClaimableEth(user);
      console.log("claimableEth:", ethers.formatEther(claimWei), "ETH");
    } catch (e: any) {
      console.log("claimableEth read failed:", e?.reason || e?.shortMessage || e?.message || e);
    }
    try {
      const canGm = await contract.canGmToday(user);
      const waitSec = await contract.getTimeUntilNextGm(user);
      console.log("canGmToday:", canGm, "timeUntilNext:", waitSec.toString(), "sec");
    } catch (e: any) {
      console.log("daily status read failed:", e?.reason || e?.shortMessage || e?.message || e);
    }
  };

  await readState("initial");

  // 1) Buy GM with 0.001 ETH
  try {
    console.log("\n[tx] buyGmTokens 0.001 ETH ...");
    const tx = await contract.buyGmTokens(zeroBytes32, emptyBytes, {
      value: ethers.parseEther("0.001"),
    });
    const r = await tx.wait();
    console.log("buyGmTokens tx:", r?.hash);
  } catch (e: any) {
    console.log("buyGmTokens failed:", e?.reason || e?.shortMessage || e?.message || e);
  }

  await readState("after buyGmTokens");

  // 2) Buy 1 spin with 10 GM (dummy encrypted one)
  try {
    console.log("\n[tx] buySpinWithGm x1 ...");
    const tx = await contract.buySpinWithGm(zeroBytes32, emptyBytes);
    const r = await tx.wait();
    console.log("buySpinWithGm tx:", r?.hash);
  } catch (e: any) {
    console.log("buySpinWithGm failed:", e?.reason || e?.shortMessage || e?.message || e);
  }

  await readState("after buySpinWithGm");

  // 3) Spin once
  try {
    console.log("\n[tx] spin ...");
    const tx = await contract.spin({ gasLimit: 500_000 });
    const r = await tx.wait();
    console.log("spin tx:", r?.hash);
    // optional: parse logs
    const topic = ethers.id("SpinCompleted(address,string)");
    const log = r?.logs?.find((l: any) => l.topics?.[0] === topic);
    if (log) {
      const iface = new ethers.Interface(ABI);
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      console.log("SpinCompleted:", parsed?.args?.[1]);
    }
  } catch (e: any) {
    console.log("spin failed:", e?.reason || e?.shortMessage || e?.message || e);
  }

  await readState("after spin");

  // 4) Claim ETH (if any)
  try {
    const claimWei = await contract.getClaimableEth(user);
    if (claimWei > 0n) {
      console.log("\n[tx] claimETH ...");
      const tx = await contract.claimETH();
      const r = await tx.wait();
      console.log("claimETH tx:", r?.hash);
    } else {
      console.log("\nNo claimable ETH to claim.");
    }
  } catch (e: any) {
    console.log("claimETH failed:", e?.reason || e?.shortMessage || e?.message || e);
  }

  await readState("final");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
