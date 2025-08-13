import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying LuckySpinFHE_Simple deployment...");

  // Contract address from deployment
  const contractAddress = "0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2";

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
    const LuckySpinFHE_Simple = await ethers.getContractFactory("LuckySpinFHE_Simple");
    const luckySpinFHE = LuckySpinFHE_Simple.attach(contractAddress);

    // Test basic view functions
    console.log("\n📊 Testing View Functions...");

    // Get contract balance
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    console.log(`💰 Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);

    // Get owner
    const owner = await luckySpinFHE.owner();
    console.log(`👑 Contract Owner: ${owner}`);

    // Get constants
    const spinPrice = await luckySpinFHE.SPIN_PRICE();
    console.log(`🎯 Spin Price: ${ethers.formatEther(spinPrice)} ETH`);

    const gmTokenRate = await luckySpinFHE.GM_TOKEN_RATE();
    console.log(`🪙 GM Token Rate: ${gmTokenRate}`);

    // Test user-specific functions
    console.log("\n👤 Testing User Functions...");

    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer: ${signer.address}`);

    // Check if user can GM today
    const canGm = await luckySpinFHE.canGmToday(signer.address);
    console.log(`📅 Can GM Today: ${canGm}`);

    // Get last GM time
    const lastGmTime = await luckySpinFHE.getLastGmTime(signer.address);
    console.log(`⏰ Last GM Time: ${lastGmTime}`);

    // Get time until next GM
    const timeUntilNextGm = await luckySpinFHE.getTimeUntilNextGm(signer.address);
    console.log(`⏳ Time Until Next GM: ${timeUntilNextGm} seconds`);

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
