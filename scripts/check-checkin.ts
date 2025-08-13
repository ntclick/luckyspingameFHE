import { ethers } from "hardhat";

// Minimal ABI for the functions we need
const ABI = [
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastCheckInDay",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserSpins",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  const args = process.argv.slice(2);
  const addrArgIdx = args.findIndex((a) => a === "--address" || a === "-a");
  const contractIdx = args.findIndex((a) => a === "--contract" || a === "-c");

  const userAddress = (addrArgIdx !== -1 && args[addrArgIdx + 1]) || process.env.ADDRESS || process.env.USER || "";
  const contractAddress =
    (contractIdx !== -1 && args[contractIdx + 1]) ||
    process.env.CONTRACT ||
    process.env.REACT_APP_FHEVM_CONTRACT_ADDRESS ||
    "";

  if (!userAddress || !ethers.isAddress(userAddress)) {
    throw new Error("Provide a valid user address via --address 0x... or ADDRESS env var");
  }
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    throw new Error(
      "Provide a valid contract address via --contract 0x... or CONTRACT/REACT_APP_FHEVM_CONTRACT_ADDRESS env var",
    );
  }

  const [signer] = await ethers.getSigners();
  const provider = signer.provider!;
  const contract = new ethers.Contract(contractAddress, ABI, provider);

  const lastDayBn: bigint = await contract.lastCheckInDay(userAddress);
  const lastDay = Number(lastDayBn.toString());
  const nowSec = Math.floor(Date.now() / 1000);
  const nowDay = Math.floor(nowSec / (24 * 60 * 60));
  const hasCheckedInToday = nowDay <= lastDay;
  const nextResetSec = (nowDay + 1) * 24 * 60 * 60;
  const nextResetIso = new Date(nextResetSec * 1000).toISOString();

  console.log("=== Daily Check-in Status ===");
  console.log("Contract:", contractAddress);
  console.log("User:", userAddress);
  console.log("lastCheckInDay:", lastDay);
  console.log("nowDay (UTC):", nowDay);
  console.log("checkedInToday:", hasCheckedInToday);
  console.log("nextResetUTC:", nextResetIso);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
