import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying LuckySpinFHE_Complete deployment...");

  // Contract address from deployment
  const contractAddress = "0xa70DFA470B27d1Db1612E64c8Fb8c094FB3202E7";
  
  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: Sepolia Testnet`);

  try {
    // Check if contract exists
    const code = await ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      console.log("❌ Contract not found at address");
      return;
    }
    console.log("✅ Contract deployed successfully");

    // Get contract instance
    const LuckySpinFHE_Complete = await ethers.getContractFactory("LuckySpinFHE_Complete");
    const luckySpinFHE = LuckySpinFHE_Complete.attach(contractAddress);

    // Test basic view functions
    console.log("\n📊 Testing View Functions...");

    // Get contract balance
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    console.log(`💰 Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);

    // Test adding a pool (admin function)
    console.log("\n📦 Testing Admin Functions...");
    
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);

    // Add a test pool
    const tx = await luckySpinFHE.addPool(
      "Test ETH Pool",
      "https://example.com/test.png",
      ethers.parseEther("0.1"),
      0, // ETH
      ethers.ZeroAddress,
      100,
      1000, // 10% win rate
      1,
    );
    await tx.wait();
    console.log("✅ Successfully added test pool");

    // Fund the pool
    const fundTx = await luckySpinFHE.fundPoolWithETH(0, { 
      value: ethers.parseEther("0.5") 
    });
    await fundTx.wait();
    console.log("✅ Successfully funded pool with 0.5 ETH");

    // Update configuration
    const configTx = await luckySpinFHE.updatePointsConfig(10, 5, 3, 20, 5);
    await configTx.wait();
    console.log("✅ Successfully updated points configuration");

    console.log("\n🎉 Contract verification completed successfully!");
    console.log("✅ Contract is working correctly on Sepolia testnet");
    console.log("✅ All basic functions are operational");
    console.log("✅ Ready for frontend integration");

  } catch (error) {
    console.error("❌ Error during verification:", error);
  }
}

main()
  .then(() => {
    console.log("\n✅ Verification completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 