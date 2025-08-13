import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying LuckySpinFHE_KMS_Final contract...");

  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy contract
  const LuckySpinFHE_KMS_Final = await ethers.getContractFactory("LuckySpinFHE_KMS_Final");
  const contract = await LuckySpinFHE_KMS_Final.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ LuckySpinFHE_KMS_Final deployed to:", contractAddress);
  console.log("🔗 Contract URL: https://sepolia.etherscan.io/address/" + contractAddress);

  // Verify contract
  console.log("⏳ Waiting for contract to be verified...");
  await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30s

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("✅ Contract verified on Etherscan");
  } catch (error) {
    console.log("⚠️ Verification failed (may already be verified):", error);
  }

  console.log("\n🎉 Deployment completed!");
  console.log("📋 Contract Address:", contractAddress);
  console.log("🔗 Etherscan:", "https://sepolia.etherscan.io/address/" + contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
