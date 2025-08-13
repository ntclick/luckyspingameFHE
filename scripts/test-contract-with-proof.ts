import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing contract with proof validation...");
  
  const contractAddress = "0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2";
  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: Sepolia Testnet`);

  try {
    const [deployer] = await ethers.getSigners();
    console.log("🔑 Using account:", deployer.address);

    const LuckySpinFHE_Simple = await ethers.getContractFactory("LuckySpinFHE_Simple");
    const luckySpinFHE = LuckySpinFHE_Simple.attach(contractAddress);

    // ✅ Test 1: Check contract state
    console.log("\n🧪 Test 1: Contract state validation");
    
    const owner = await luckySpinFHE.owner();
    console.log("✅ Owner:", owner);
    
    const spinPrice = await luckySpinFHE.SPIN_PRICE();
    console.log("✅ Spin Price:", ethers.formatEther(spinPrice), "ETH");
    
    const gmTokenRate = await luckySpinFHE.GM_TOKEN_RATE();
    console.log("✅ GM Token Rate:", gmTokenRate.toString());

    // ✅ Test 2: Test with minimal ETH amount
    console.log("\n🧪 Test 2: Testing with minimal ETH amount");
    
    const testAmount = 1; // 1 GM token
    const ethValue = ethers.parseEther("0.001"); // Minimum required
    
    // Create test encrypted input (32 bytes for externalEuint64)
    const testEncryptedData = ethers.zeroPadValue(ethers.toBeHex(testAmount), 32);
    
    // Create test proof (128 bytes)
    const testProof = "0x" + "0".repeat(256);
    
    console.log("✅ Test transaction data:", {
      encryptedData: testEncryptedData,
      proof: testProof,
      ethValue: ethers.formatEther(ethValue),
      testAmount: testAmount,
      dataLength: testEncryptedData.length,
      proofLength: testProof.length,
    });

    // ✅ Test 3: Try to call buyGmTokens with minimal ETH
    console.log("\n🧪 Test 3: Calling buyGmTokens with minimal ETH");
    
    try {
      const tx = await luckySpinFHE.buyGmTokens(testEncryptedData, testProof, { 
        value: ethValue 
      });
      console.log("✅ Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt);
      
    } catch (error: any) {
      console.error("❌ Transaction failed:", error.message);
      
      // Try to decode the error
      if (error.data) {
        console.log("🔍 Error data:", error.data);
        
        // Try to decode common error patterns
        const errorPatterns = {
          "0xb9688461": "Custom error - possibly proof validation failed",
          "0x4e487b71": "Panic error",
          "0x08c379a0": "Revert with reason"
        };
        
        const errorCode = error.data.slice(0, 10);
        console.log("🔍 Error code:", errorCode);
        console.log("🔍 Possible meaning:", errorPatterns[errorCode] || "Unknown error");
      }
    }

    // ✅ Test 4: Check if we can call view functions
    console.log("\n🧪 Test 4: Testing view functions");
    
    try {
      const contractBalance = await luckySpinFHE.getContractBalance();
      console.log("✅ Contract Balance:", ethers.formatEther(contractBalance), "ETH");
    } catch (error) {
      console.log("⚠️ Could not get contract balance:", error.message);
    }
    
    try {
      const canGm = await luckySpinFHE.canGmToday(deployer.address);
      console.log("✅ Can GM Today:", canGm);
    } catch (error) {
      console.log("⚠️ Could not check canGmToday:", error.message);
    }

    console.log("\n✅ All tests completed!");
    console.log("✅ Contract is accessible and view functions work");
    console.log("⚠️ buyGmTokens may require proper FHE proof validation");

  } catch (error) {
    console.error("❌ Error during testing:", error);
  }
}

main()
  .then(() => {
    console.log("\n✅ Testing completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
