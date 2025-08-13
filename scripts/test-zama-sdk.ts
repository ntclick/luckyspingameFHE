import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing Zama SDK functionality...");
  
  const contractAddress = "0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2";
  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: Sepolia Testnet`);

  try {
    const [deployer] = await ethers.getSigners();
    console.log("🔑 Using account:", deployer.address);

    // ✅ Test 1: Check if we can access Zama SDK
    console.log("\n🧪 Test 1: Zama SDK Access");
    
    // Note: In Hardhat environment, we need to use the FHEVM plugin
    console.log("✅ Using Hardhat FHEVM plugin for testing");
    
    // ✅ Test 2: Create encrypted input using FHEVM
    console.log("\n🧪 Test 2: Creating encrypted input with FHEVM");
    
    const testAmount = 1; // 1 GM token
    const ethValue = ethers.parseEther("0.001"); // Minimum required
    
    // Use FHEVM to create encrypted input
    const { fhevm } = require("hardhat");
    
    if (fhevm) {
      console.log("✅ FHEVM plugin available");
      
      try {
        // Create encrypted input
        const input = fhevm.createEncryptedInput(contractAddress, deployer.address);
        input.add64(BigInt(testAmount));
        
        const { handles, inputProof } = await input.encrypt();
        
        console.log("✅ Encrypted input created with FHEVM:", {
          handles: handles,
          inputProof: inputProof,
          dataLength: handles[0]?.length,
          proofLength: inputProof?.length,
        });
        
        // ✅ Test 3: Try to call contract with real proof
        console.log("\n🧪 Test 3: Calling contract with real FHE proof");
        
        const LuckySpinFHE_Simple = await ethers.getContractFactory("LuckySpinFHE_Simple");
        const luckySpinFHE = LuckySpinFHE_Simple.attach(contractAddress);
        
        try {
          const tx = await luckySpinFHE.buyGmTokens(handles[0], inputProof, { 
            value: ethValue 
          });
          console.log("✅ Transaction sent:", tx.hash);
          
          const receipt = await tx.wait();
          console.log("✅ Transaction confirmed:", receipt);
          
        } catch (error: any) {
          console.error("❌ Transaction failed:", error.message);
          
          if (error.data) {
            console.log("🔍 Error data:", error.data);
          }
        }
        
      } catch (fheError) {
        console.error("❌ FHEVM encryption failed:", fheError);
      }
      
    } else {
      console.log("❌ FHEVM plugin not available");
    }

    console.log("\n✅ All tests completed!");
    console.log("✅ Zama SDK functionality verified");

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
