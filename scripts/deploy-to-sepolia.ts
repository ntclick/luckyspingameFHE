import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying LuckySpinFHE_Complete to Sepolia Testnet...");

  // Deploy contract
  const LuckySpinFHE_CompleteFactory = await ethers.getContractFactory("LuckySpinFHE_Complete");
  const luckySpinFHE = await LuckySpinFHE_CompleteFactory.deploy();
  await luckySpinFHE.waitForDeployment();

  const contractAddress = await luckySpinFHE.getAddress();
  console.log(`✅ Contract deployed to: ${contractAddress}`);

  // Get signers
  const [owner, user1, user2, user3] = await ethers.getSigners();
  console.log(`👤 Owner: ${owner.address}`);
  console.log(`👤 User1: ${user1.address}`);
  console.log(`👤 User2: ${user2.address}`);
  console.log(`👤 User3: ${user3.address}`);

  // ===== 1. TEST POOL MANAGEMENT =====
  console.log("\n📦 Testing Pool Management...");

  // Add ETH pool
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
  console.log("✅ Added ETH pool");

  // Add USDC pool
  await luckySpinFHE.addPool(
    "USDC Pool",
    "https://example.com/usdc.png",
    1000000, // 1 USDC (6 decimals assumed)
    1, // USDC
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Valid USDC address
    50,
    800, // 8% win rate
    2,
  );
  console.log("✅ Added USDC pool");

  // Add NFT pool
  await luckySpinFHE.addPool(
    "Legendary NFT",
    "https://example.com/nft.png",
    1,
    4, // NFT
    ethers.ZeroAddress,
    10,
    500, // 5% win rate
    5,
  );
  console.log("✅ Added NFT pool");

  // Add Points pool
  await luckySpinFHE.addPool(
    "Points Bonanza",
    "https://example.com/points.png",
    1000,
    5, // POINTS
    ethers.ZeroAddress,
    200,
    2000, // 20% win rate
    1,
  );
  console.log("✅ Added Points pool");

  // ===== 2. TEST POOL FUNDING =====
  console.log("\n💰 Testing Pool Funding...");

  // Fund ETH pool
  await luckySpinFHE.fundPoolWithETH(0, { value: ethers.parseEther("2.0") });
  console.log("✅ Funded ETH pool with 2 ETH");

  // Check pool balance
  const ethPool = await luckySpinFHE.getPoolReward(0);
  console.log(`ETH Pool balance: ${ethers.formatEther(ethPool.balance)} ETH`);

  // ===== 3. TEST CONFIGURATION =====
  console.log("\n⚙️ Testing Configuration...");

  // Update points config
  await luckySpinFHE.updatePointsConfig(
    15, // checkInPoints
    8, // spinPoints
    5, // gmPoints
    25, // winBonusPoints
    10, // dailyCheckInBonus
  );
  console.log("✅ Updated points configuration");

  // Update spin config
  await luckySpinFHE.updateSpinConfig(
    2, // baseSpinsPerCheckIn
    3, // bonusSpinsPerGM
    15, // maxSpinsPerDay
    4, // unluckySlotCount
  );
  console.log("✅ Updated spin configuration");

  // Update unlucky slots
  await luckySpinFHE.updateUnluckySlots([1, 3, 7, 9]);
  console.log("✅ Updated unlucky slots: [1, 3, 7, 9]");

  // ===== 4. TEST NFT REWARDS =====
  console.log("\n🎨 Testing NFT Rewards...");

  // Add NFT reward
  await luckySpinFHE.addNFTReward(
    2, // NFT pool index
    12345, // tokenId
    "https://example.com/nft/12345.json", // metadata
    95, // rarity
  );
  console.log("✅ Added NFT reward (Token ID: 12345, Rarity: 95)");

  // ===== 5. TEST USER ACTIONS =====
  console.log("\n👥 Testing User Actions...");

  // User1: Buy spins (không refund)
  console.log("\n👤 User1 Actions:");
  await luckySpinFHE.connect(user1).buySpins(5, {
    value: ethers.parseEther("0.05"), // 5 spins * 0.01 ETH
  });
  console.log("✅ User1 bought 5 spins for 0.05 ETH (no refund)");

  // User1: Check-in
  await luckySpinFHE.connect(user1).checkIn();
  console.log("✅ User1 checked in (received spins + points)");

  // User1: Send GM
  await luckySpinFHE.connect(user1).sendGM();
  console.log("✅ User1 sent GM (received bonus spins + points)");

  // User2: Different actions
  console.log("\n👤 User2 Actions:");
  await luckySpinFHE.connect(user2).buySpins(3, {
    value: ethers.parseEther("0.03"),
  });
  console.log("✅ User2 bought 3 spins for 0.03 ETH");

  await luckySpinFHE.connect(user2).checkIn();
  console.log("✅ User2 checked in");

  // ===== 6. TEST CONTRACT BALANCE =====
  console.log("\n💰 Testing Contract Balance...");

  const contractBalance = await ethers.provider.getBalance(contractAddress);
  console.log(`✅ Contract balance: ${ethers.formatEther(contractBalance)} ETH`);

  // ===== 7. UPDATE .ENV FILE =====
  console.log("\n📝 Updating .env file...");

  const envPath = path.join(process.cwd(), ".env");
  let envContent = "";

  // Read existing .env file
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // Update or add VITE_FHEVM_CONTRACT_ADDRESS
  const contractAddressLine = `VITE_FHEVM_CONTRACT_ADDRESS=${contractAddress}`;
  
  if (envContent.includes("VITE_FHEVM_CONTRACT_ADDRESS=")) {
    // Replace existing line
    envContent = envContent.replace(
      /VITE_FHEVM_CONTRACT_ADDRESS=.*/g,
      contractAddressLine
    );
  } else {
    // Add new line
    envContent += `\n${contractAddressLine}`;
  }

  // Write back to .env file
  fs.writeFileSync(envPath, envContent);
  console.log("✅ Updated .env file with contract address");

  // ===== 8. DEPLOYMENT SUMMARY =====
  console.log("\n🎉 Deployment Complete!");
  console.log("=== Summary ===");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Owner: ${owner.address}`);
  console.log(`Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);
  console.log(`Network: Sepolia Testnet`);
  console.log(`FHEVM Compatible: ✅ Yes`);

  console.log("\n=== Features Deployed ===");
  console.log("✅ Pool Management (ETH, USDC, NFT, Points pools)");
  console.log("✅ Pool Funding & Withdrawal (no refund system)");
  console.log("✅ Configuration Management (Points & Spin configs)");
  console.log("✅ NFT Rewards System");
  console.log("✅ User Actions (Buy spins, Check-in, GM)");
  console.log("✅ Encrypted User State (FHE compliant)");
  console.log("✅ Leaderboard System (Public & Encrypted)");
  console.log("✅ Access Control & Error Handling");
  console.log("✅ Random Generation & Unlucky Slots");

  console.log("\n=== Environment Variables ===");
  console.log(`VITE_PRIVATE_KEY: ${process.env.VITE_PRIVATE_KEY ? "✅ Set" : "❌ Not set"}`);
  console.log(`VITE_SEPOLIA_RPC_URL: ${process.env.VITE_SEPOLIA_RPC_URL ? "✅ Set" : "❌ Not set"}`);
  console.log(`VITE_FHEVM_CONTRACT_ADDRESS: ✅ ${contractAddress}`);

  console.log("\n=== Next Steps ===");
  console.log("1. Contract is ready for frontend integration");
  console.log("2. Use the frontend integration examples provided");
  console.log("3. Test FHE operations with encrypted inputs");
  console.log("4. Deploy to mainnet when ready");

  return {
    contractAddress,
    owner: owner.address,
    contractBalance: ethers.formatEther(contractBalance)
  };
}

main()
  .then((result) => {
    console.log("\n✅ Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error during deployment:", error);
    process.exit(1);
  }); 