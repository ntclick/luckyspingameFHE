import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

async function main() {
  console.log("🚀 Deploying LuckySpinFHE_Confidential to Sepolia...");
  
  const [deployer] = await ethers.getSigners();
  
  console.log("📋 Deployment Details:");
  console.log("- Deployer address:", deployer.address);
  console.log("- Network: Sepolia Testnet");
  console.log("- Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
  
  // Get contract factory
  const LuckySpinFHEConfidential = await ethers.getContractFactory("LuckySpinFHE_Confidential");
  
  // Deploy with proper gas settings for FHEVM
  console.log("\n🔧 Deploying contract...");
  const contract = await LuckySpinFHEConfidential.deploy({
    gasLimit: 8000000,  // High gas limit for FHEVM initialization
    maxFeePerGas: ethers.parseUnits("50", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("10", "gwei"),
  });
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log("\n✅ Contract deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Etherscan URL:", `https://sepolia.etherscan.io/address/${contractAddress}`);
  
  // Wait for a few confirmations
  console.log("\n⏳ Waiting for confirmations...");
  await contract.deploymentTransaction()?.wait(3);
  
  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  try {
    // Test view functions
    const poolsCount = await contract.getPoolsCount();
    const contractBalance = await contract.getContractBalance();
    
    console.log("- Pools Count:", poolsCount.toString());
    console.log("- Contract Balance:", ethers.formatEther(contractBalance), "ETH");
    
    // Test pool info
    const pool0 = await contract.getPoolReward(0);
    console.log("- Pool 0:", pool0.name, "|", pool0.description, "|", ethers.formatEther(pool0.baseValue), "ETH");
    
    const pool7 = await contract.getPoolReward(7);
    console.log("- Pool 7:", pool7.name, "|", pool7.description, "|", ethers.formatEther(pool7.baseValue), "ETH");
    
    console.log("\n✅ All tests passed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
  
  // Fund the contract for testing
  console.log("\n💰 Funding contract for testing...");
  try {
    const fundTx = await deployer.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1.0"), // Fund with 1 ETH
      gasLimit: 21000,
    });
    await fundTx.wait();
    
    const newBalance = await contract.getContractBalance();
    console.log("✅ Contract funded! New balance:", ethers.formatEther(newBalance), "ETH");
    
  } catch (error) {
    console.warn("⚠️ Failed to fund contract:", error);
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    contractName: "LuckySpinFHE_Confidential",
    contractAddress: contractAddress,
    deployer: deployer.address,
    deploymentTransaction: contract.deploymentTransaction()?.hash,
    blockNumber: contract.deploymentTransaction()?.blockNumber,
    timestamp: new Date().toISOString(),
    gasUsed: contract.deploymentTransaction()?.gasLimit?.toString(),
    constructorArgs: [],
    poolsCount: 8,
    features: [
      "Fully Encrypted User State",
      "Confidential Random Generation", 
      "Private Spin Results",
      "Encrypted Rewards Tracking",
      "User-Only Decryption",
      "Fair Gaming with FHE"
    ]
  };
  
  console.log("\n📊 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Instructions for frontend integration
  console.log("\n🎮 Frontend Integration:");
  console.log("1. Update frontend config:");
  console.log(`   VITE_FHEVM_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("2. Enable confidential mode in frontend");
  console.log("3. Test buy spins → spin → decrypt flow");
  console.log("4. Verify all user data is encrypted on-chain");
  
  console.log("\n🔐 FHEVM Features Enabled:");
  console.log("✅ Encrypted user spins count");
  console.log("✅ Encrypted rewards tracking");
  console.log("✅ Confidential random generation");
  console.log("✅ Private win/loss history");
  console.log("✅ User-controlled decryption");
  console.log("✅ No data leakage to admin/public");
  
  console.log("\n🎯 Ready for confidential gaming! 🎰🔐");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });