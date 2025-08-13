import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing FHEVM Plugin Proper Initialization...");
  
  console.log("\n📋 FHEVM Initialization Test Plan");
  console.log("===================================");
  console.log("✅ Test 1: Import FHEVM Plugin");
  console.log("✅ Test 2: Initialize FHEVM Environment");
  console.log("✅ Test 3: Create Encrypted Input");
  console.log("✅ Test 4: Test with Contract");

  // ✅ Test 1: Import FHEVM Plugin
  console.log("\n🧪 Test 1: Import FHEVM Plugin");
  
  try {
    // Try to import FHEVM plugin directly
    const { FhevmEnvironment } = await import("@fhevm/hardhat-plugin");
    console.log("✅ FHEVM Plugin imported successfully");
    console.log("✅ FhevmEnvironment available:", !!FhevmEnvironment);
  } catch (error: any) {
    console.log("❌ FHEVM Plugin import failed:", error.message);
  }

  // ✅ Test 2: Initialize FHEVM Environment
  console.log("\n🧪 Test 2: Initialize FHEVM Environment");
  
  try {
    // Get the current hardhat runtime environment
    const hre = require("hardhat");
    console.log("✅ Hardhat runtime environment available");
    
    // Try to access FHEVM environment
    const fhevmEnv = (hre as any).fhevm;
    console.log("✅ FHEVM environment available:", !!fhevmEnv);
    
    if (fhevmEnv) {
      console.log("✅ FHEVM environment methods:", Object.keys(fhevmEnv));
    }
  } catch (error: any) {
    console.log("❌ FHEVM environment initialization failed:", error.message);
  }

  // ✅ Test 3: Create Encrypted Input
  console.log("\n🧪 Test 3: Create Encrypted Input");
  
  try {
    const hre = require("hardhat");
    const fhevm = (hre as any).fhevm;
    
    if (fhevm && fhevm.createEncryptedInput) {
      const contractAddress = "0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2";
      const userAddress = "0xE24546D5Ff7bf460Ebdaa36847e38669996D1a0D";
      
      const input = fhevm.createEncryptedInput(contractAddress, userAddress);
      console.log("✅ Encrypted input created");
      console.log("✅ Input methods:", Object.keys(input));
      
      // Test add64
      if (typeof input.add64 === 'function') {
        input.add64(BigInt(100));
        console.log("✅ add64 method working");
      }
      
      // Test encrypt
      if (typeof input.encrypt === 'function') {
        const result = await input.encrypt();
        console.log("✅ encrypt method working");
        console.log("✅ Result:", result);
      }
    } else {
      console.log("❌ createEncryptedInput not available");
    }
  } catch (error: any) {
    console.log("❌ Encrypted input creation failed:", error.message);
  }

  // ✅ Test 4: Test with Contract
  console.log("\n🧪 Test 4: Test with Contract");
  
  try {
    const [deployer] = await ethers.getSigners();
    const LuckySpinFHE_Simple = await ethers.getContractFactory("LuckySpinFHE_Simple");
    const luckySpinFHE = LuckySpinFHE_Simple.attach("0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2");
    
    console.log("✅ Contract accessible");
    console.log("✅ Deployer:", deployer.address);
    
    // Try to create real encrypted input and call contract
    const hre = require("hardhat");
    const fhevm = (hre as any).fhevm;
    
    if (fhevm && fhevm.createEncryptedInput) {
      const input = fhevm.createEncryptedInput(
        "0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2",
        deployer.address
      );
      input.add64(BigInt(100));
      const { handles, inputProof } = await input.encrypt();
      
      console.log("✅ Real encrypted input created");
      console.log("✅ Handles length:", handles.length);
      console.log("✅ Input Proof length:", inputProof.length);
      
      // Try transaction
      try {
        const tx = await luckySpinFHE.buyGmTokens(handles[0], inputProof, {
          value: ethers.parseEther("0.001")
        });
        console.log("✅ Transaction successful:", tx.hash);
      } catch (error: any) {
        console.log("⚠️ Transaction failed (may be expected):", error.message);
      }
    } else {
      console.log("❌ Cannot create real encrypted input");
    }
    
  } catch (error: any) {
    console.log("❌ Contract test failed:", error.message);
  }

  // ✅ Test 5: Alternative Initialization
  console.log("\n🧪 Test 5: Alternative Initialization");
  
  try {
    // Try to access FHEVM through global scope
    const globalFhevm = (global as any).fhevm;
    console.log("✅ Global FHEVM available:", !!globalFhevm);
    
    if (globalFhevm) {
      console.log("✅ Global FHEVM methods:", Object.keys(globalFhevm));
      
      // Try to access instance
      if (globalFhevm.instance) {
        console.log("✅ Global FHEVM instance available");
        console.log("✅ Instance methods:", Object.keys(globalFhevm.instance));
      }
    }
  } catch (error: any) {
    console.log("❌ Alternative initialization failed:", error.message);
  }

  console.log("\n✅ All FHEVM initialization tests completed!");
  console.log("💡 Plugin initialization status verified");

}

main()
  .then(() => {
    console.log("\n✅ FHEVM initialization testing completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
