import { ethers } from "hardhat";

async function testDailyGmFeatures() {
  console.log("🧪 Testing Daily GM and Buy GM Tokens Features...");

  try {
    // ✅ Get signer
    const [deployer] = await ethers.getSigners();
    if (!deployer) {
      throw new Error("No signers available");
    }

    console.log("👤 Testing with account:", deployer.address);

    // ✅ Contract configuration
    const contractAddress = "0xFe362918eA6b974FBf2355364a286aF0973b9EF2"; // Updated address
    const contractABI = [
      "function dailyGm(bytes calldata encryptedGmValue, bytes calldata proof) external",
      "function buyGmTokens(bytes calldata encryptedAmount, bytes calldata proof) external payable",
      "function canGmToday(address user) external view returns (bool)",
      "function getLastGmTime(address user) external view returns (uint256)",
      "function getTimeUntilNextGm(address user) external view returns (uint256)",
      "function userSpins(address user) external view returns (bytes)",
      "function GM_TOKEN_RATE() external view returns (uint256)",
      "event DailyGmCompleted(address indexed user, uint256 timestamp)",
      "event GmTokensBought(address indexed user, uint256 amount)",
    ];

    // ✅ Create contract instance
    const contract = new ethers.Contract(contractAddress, contractABI, deployer);

    // ✅ Test 1: Check GM Token Rate
    console.log("\n📊 Testing GM Token Rate...");
    const gmTokenRate = await contract.GM_TOKEN_RATE();
    console.log("✅ GM Token Rate:", gmTokenRate.toString());

    // ✅ Test 2: Check if user can GM today
    console.log("\n🌅 Testing Daily GM Status...");
    const canGmToday = await contract.canGmToday(deployer.address);
    console.log("✅ Can GM today:", canGmToday);

    // ✅ Test 3: Get last GM time
    console.log("\n⏰ Testing Last GM Time...");
    const lastGmTime = await contract.getLastGmTime(deployer.address);
    console.log("✅ Last GM time:", lastGmTime.toString());

    // ✅ Test 4: Get time until next GM
    console.log("\n⏳ Testing Time Until Next GM...");
    const timeUntilNextGm = await contract.getTimeUntilNextGm(deployer.address);
    console.log("✅ Time until next GM:", timeUntilNextGm.toString(), "seconds");

    // ✅ Test 5: Get user spins (encrypted)
    console.log("\n🎰 Testing User Spins...");
    const userSpins = await contract.userSpins(deployer.address);
    console.log("✅ User spins (encrypted):", userSpins);

    console.log("\n🎯 All tests completed successfully!");
    console.log("📋 Summary:");
    console.log("  - GM Token Rate:", gmTokenRate.toString());
    console.log("  - Can GM today:", canGmToday);
    console.log("  - Last GM time:", lastGmTime.toString());
    console.log("  - Time until next GM:", timeUntilNextGm.toString(), "seconds");
    console.log("  - User spins:", userSpins);

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testDailyGmFeatures()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
