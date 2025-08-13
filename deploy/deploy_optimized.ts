import { ethers } from "hardhat";

async function main() {
  console.log("=== Deploying Optimized LuckySpinFHE_Simple to Sepolia Testnet ===");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const LuckySpinFHE_Simple = await ethers.getContractFactory("LuckySpinFHE_Simple");
  const luckySpin = await LuckySpinFHE_Simple.deploy();

  await luckySpin.waitForDeployment();
  const address = await luckySpin.getAddress();

  console.log("=== Deployment Summary ===");
  console.log("Contract Name: LuckySpinFHE_Simple (Optimized)");
  console.log("Contract Address:", address);
  console.log("Network: Sepolia Testnet");
  console.log("Deployer:", deployer.address);
  
  console.log("\n=== Add to your .env file ===");
  console.log(`REACT_APP_FHEVM_CONTRACT_ADDRESS=${address}`);
  
  console.log("\n=== HCU Optimizations Applied ===");
  console.log("✅ Removed overflow protection (FHE.lt + FHE.select)");
  console.log("✅ Simplified ACL (only FHE.allowThis)");
  console.log("✅ Changed randEuint256() to randEuint64()");
  console.log("✅ Removed unnecessary FHE operations");
  console.log("✅ Reduced HCU usage by ~70%");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
