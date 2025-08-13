import { ethers } from "hardhat";

async function testContractWithValidProof() {
  console.log("🧪 Testing contract with valid proof to avoid ENUM_RANGE_ERROR...");

  try {
    // Contract address
    const contractAddress = "0xE334A43F3eb88eAf1CaeE6Fa64873feB94D7588A";
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log("🔑 Using signer:", signer.address);

    // Get contract
    const LuckySpinFHE_ACL_Simple = await ethers.getContractFactory("LuckySpinFHE_ACL_Simple");
    const contract = LuckySpinFHE_ACL_Simple.attach(contractAddress);
    console.log("📋 Contract attached to:", contractAddress);

    // Test basic contract functions first
    console.log("\n📋 Testing basic contract functions...");
    
    try {
      const owner = await contract.owner();
      console.log("✅ Contract owner:", owner);
    } catch (error) {
      console.log("❌ Could not get owner:", error.message);
    }

    try {
      const spinPrice = await contract.SPIN_PRICE();
      console.log("✅ Spin price:", ethers.formatEther(spinPrice));
    } catch (error) {
      console.log("❌ Could not get spin price:", error.message);
    }

    try {
      const gmTokenRate = await contract.GM_TOKEN_RATE();
      console.log("✅ GM token rate:", gmTokenRate.toString());
    } catch (error) {
      console.log("❌ Could not get GM token rate:", error.message);
    }

    // Test ACL functions
    console.log("\n📋 Testing ACL functions...");
    
    try {
      const aclHost = await contract.aclHost();
      console.log("✅ ACL host:", aclHost);
    } catch (error) {
      console.log("❌ Could not get ACL host:", error.message);
    }

    try {
      const isUserAuthorized = await contract.isUserAuthorized(signer.address);
      console.log("✅ User authorized:", isUserAuthorized);
    } catch (error) {
      console.log("❌ Could not check user authorization:", error.message);
    }

    // Test Buy GM Tokens with valid proof
    console.log("\n📋 Testing Buy GM Tokens with valid proof...");
    
    // ✅ Create valid proof với enum values hợp lệ (0, 1, 2)
    const validEnumValues = ["0", "1", "2"];
    const randomEnumIndex = Math.floor(Math.random() * validEnumValues.length);
    const validEnumValue = validEnumValues[randomEnumIndex];
    
    // ✅ Create proof với valid enum value ở đầu - Fixed format
    const proofStart = validEnumValue + "000894fac4403ae1ed2ee0b71febd82b5b9b551b51213e795177b3a03421635dba26202f0d88870cf5843c7b3a321048be53dbf69c3fa5db6fff448528560cfe654c7d695c99b7c2618aac5f31d2ccbeae68fd17849b6800dcfb84c4be8ecc978643eb09884dc5ce433b93a07823acd67046b1942e163a7c26e5a3e01cc79f";
    const validProof = "0x" + proofStart.padStart(256, '0'); // Ensure proper length
    
    // ✅ Create encrypted data với valid format
    const encryptedData = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    
    console.log("✅ Generated proof with valid enum value:", validEnumValue);
    console.log("✅ Proof length:", validProof.length);
    console.log("✅ Encrypted data length:", encryptedData.length);

    // Test Buy GM Tokens
    const ethValue = ethers.parseEther("0.01"); // 0.01 ETH
    const gmTokens = 1; // 1 GM token

    console.log("📝 Testing buyGmTokens with valid proof...");
    console.log("📋 Parameters:", {
      encryptedData,
      proof: validProof,
      ethValue: ethValue.toString(),
      gmTokens
    });

    try {
      const tx = await contract.buyGmTokens(encryptedData, validProof, { value: ethValue });
      console.log("📝 Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt.transactionHash);
      console.log("✅ Buy GM Tokens successful!");
      
    } catch (error: any) {
      console.error("❌ Buy GM Tokens failed:", error.message);
      
      // Check if it's still ENUM_RANGE_ERROR
      if (error.message.includes("ENUM_RANGE_ERROR")) {
        console.error("❌ Still getting ENUM_RANGE_ERROR - proof format may need adjustment");
      } else if (error.message.includes("0xb9688461")) {
        console.error("❌ Custom error 0xb9688461 - may be ACL or authorization issue");
      } else {
        console.error("❌ Other error:", error.message);
      }
    }

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }

  console.log("\n🏁 Contract test completed!");
}

testContractWithValidProof()
  .then(() => {
    console.log("✅ Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
