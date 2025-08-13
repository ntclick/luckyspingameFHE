import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying LuckySpinFHE_Simple on Etherscan...");

  const contractAddress = "0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2";

  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: Sepolia Testnet`);

  try {
    // Verify contract on Etherscan
    console.log("\n🔍 Running Etherscan verification...");

    await hre.run("verify:verify", {
      address: contractAddress,
      contract: "contracts/LuckySpinFHE_Simple.sol:LuckySpinFHE_Simple",
      constructorArguments: [],
    });

    console.log("✅ Contract verified successfully on Etherscan!");
    console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
  } catch (error) {
    console.error("❌ Error during Etherscan verification:", error);

    // Check if contract is already verified
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract is already verified on Etherscan!");
      console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
    } else {
      console.log("❌ Verification failed. Please check the error above.");
    }
  }
}

main()
  .then(() => {
    console.log("\n✅ Verification process completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
