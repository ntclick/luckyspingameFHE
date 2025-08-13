import { ethers } from "hardhat";

async function main() {
  console.log("=== Deploying LuckySpinFHE_Strict (FHE-only) to Sepolia Testnet ===");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const Factory = await ethers.getContractFactory("LuckySpinFHE_Strict");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("=== Deployment Summary ===");
  console.log("Contract Name: LuckySpinFHE_Strict");
  console.log("Contract Address:", address);
  console.log("Network: Sepolia Testnet");
  console.log("Deployer:", deployer.address);

  console.log("\n=== Add to your .env file ===");
  console.log(`REACT_APP_FHEVM_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
