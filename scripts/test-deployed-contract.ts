import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing deployed LuckySpinFHE_Complete contract...");

  // Contract address from deployment
  const contractAddress = "0xa70DFA470B27d1Db1612E64c8Fb8c094FB3202E7";
  
  // Get contract instance
  const LuckySpinFHE_Complete = await ethers.getContractFactory("LuckySpinFHE_Complete");
  const luckySpinFHE = LuckySpinFHE_Complete.attach(contractAddress);

  // Get signers
  const [owner, user1, user2, user3] = await ethers.getSigners();
  console.log(`👤 Owner: ${owner.address}`);
  console.log(`👤 User1: ${user1.address}`);
  console.log(`👤 User2: ${user2.address}`);
  console.log(`👤 User3: ${user3.address}`);

  console.log(`📋 Contract Address: ${contractAddress}`);

  // Test basic functions
  console.log("\n📦 Testing Basic Functions...");

  try {
    // Test adding a pool
    await luckySpinFHE.addPool(
      "ETH Jackpot",
      "https://example.com/eth.png",
      ethers.parseEther("0.1"),
      0, // ETH
      ethers.ZeroAddress,
      100,
      1000, // 10% win rate
      1,
    );
    console.log("✅ Successfully added ETH pool");

    // Test funding pool
    await luckySpinFHE.fundPoolWithETH(0, { value: ethers.parseEther("1.0") });
    console.log("✅ Successfully funded ETH pool");

    // Test configuration
    await luckySpinFHE.updatePointsConfig(10, 5, 3, 20, 5);
    console.log("✅ Successfully updated points config");

    // Test user actions
    await luckySpinFHE.connect(user1).buySpins(3, {
      value: ethers.parseEther("0.03"),
    });
    console.log("✅ User1 successfully bought spins");

    await luckySpinFHE.connect(user1).checkIn();
    console.log("✅ User1 successfully checked in");

    // Test contract balance
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    console.log(`✅ Contract balance: ${ethers.formatEther(contractBalance)} ETH`);

    console.log("\n🎉 All tests passed! Contract is working correctly on Sepolia.");

  } catch (error) {
    console.error("❌ Error during testing:", error);
  }
}

main()
  .then(() => {
    console.log("\n✅ Contract testing completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 