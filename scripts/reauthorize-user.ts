import { ethers } from "ethers";

async function main() {
  // Update these if needed
  const RPC_URL = process.env.REACT_APP_SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/oppYpzscO7hdTG6hopypG6Opn3Xp7lR_";
  const PRIVATE_KEY = process.env.REACT_APP_PRIVATE_KEY || "859b25f164df967d1b6b04b81693a9f53785a6f2b03bf3c6b20796f60ca8d814";
  const CONTRACT_ADDRESS = process.env.REACT_APP_FHEVM_CONTRACT_ADDRESS || "0x05b75403044f2F70F4Da3d30b1478604fA717cAa";

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : ("0x" + PRIVATE_KEY), provider);

  console.log(`Signer: ${wallet.address}`);
  console.log(`Contract: ${CONTRACT_ADDRESS}`);

  const abi = [
    "function reauthorize() external",
  ];

  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

  console.log("Calling reauthorize() ...");
  const tx = await contract.reauthorize();
  console.log("Tx sent:", tx.hash);
  const rc = await tx.wait();
  console.log("Reauthorize confirmed in block", rc?.blockNumber);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
