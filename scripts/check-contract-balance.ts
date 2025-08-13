import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking contract balance...");

  const contractAddress = "0xb3619B668044B18F01ee0362788FE1E04976Bbc7";

  // Get provider
  const provider = new ethers.JsonRpcProvider(
    process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/demo",
  );

  // Get contract balance
  const balance = await provider.getBalance(contractAddress);
  const balanceEth = ethers.formatEther(balance);

  console.log("📊 Contract Balance:", balanceEth, "ETH");
  console.log("💰 Raw Balance:", balance.toString(), "wei");

  // Check if balance is sufficient for prizes
  const minRequired = ethers.parseEther("0.1"); // Minimum for 0.1 ETH prize
  if (balance < minRequired) {
    console.log("⚠️  WARNING: Contract balance insufficient for prizes!");
    console.log("   Required: 0.1 ETH");
    console.log("   Available:", balanceEth, "ETH");
  } else {
    console.log("✅ Contract has sufficient balance for prizes");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
