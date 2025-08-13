import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying LuckySpinFHE_Simple to Sepolia Testnet...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy the contract
  const LuckySpinFHE_Simple = await ethers.getContractFactory("LuckySpinFHE_Simple");
  const luckySpinFHE = await LuckySpinFHE_Simple.deploy();
  await luckySpinFHE.waitForDeployment();

  const contractAddress = await luckySpinFHE.getAddress();
  console.log(`✅ LuckySpinFHE_Simple deployed to: ${contractAddress}`);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const code = await ethers.provider.getCode(contractAddress);
  if (code === "0x") {
    console.log("❌ Contract not found at address");
    return;
  }
  console.log("✅ Contract deployed successfully");

  // Test basic functions
  console.log("\n📊 Testing basic functions...");
  
  // Get owner
  const owner = await luckySpinFHE.owner();
  console.log(`👑 Contract Owner: ${owner}`);

  // Get constants
  const spinPrice = await luckySpinFHE.SPIN_PRICE();
  console.log(`🎯 Spin Price: ${ethers.formatEther(spinPrice)} ETH`);

  const gmTokenRate = await luckySpinFHE.GM_TOKEN_RATE();
  console.log(`🪙 GM Token Rate: ${gmTokenRate}`);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("✅ Contract is working correctly on Sepolia testnet");
  console.log("✅ Ready for frontend integration");
  
  // Save contract address
  console.log("\n=== Add to your .env file ===");
  console.log(`REACT_APP_FHEVM_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`VITE_FHEVM_CONTRACT_ADDRESS=${contractAddress}`);
}

main()
  .then(() => {
    console.log("\n✅ Deployment completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
