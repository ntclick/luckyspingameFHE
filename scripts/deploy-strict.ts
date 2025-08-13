import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying LuckySpinFHE_Strict to Sepolia Testnet...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const Factory = await ethers.getContractFactory("LuckySpinFHE_Strict");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ LuckySpinFHE_Strict deployed to: ${address}`);

  // Basic verification
  const code = await ethers.provider.getCode(address);
  if (code === "0x") {
    console.error("❌ Contract code not found at address");
    process.exit(1);
  }
  console.log("✅ Contract code present");

  // Output .env lines for convenience
  console.log("\n=== Add to your frontend .env ===");
  console.log(`REACT_APP_FHEVM_CONTRACT_ADDRESS=${address}`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
