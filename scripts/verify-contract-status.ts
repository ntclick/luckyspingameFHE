import { ethers } from "hardhat";

async function verifyContractStatus() {
  console.log("🔍 Verifying contract status...");

  // Contract addresses to check
  const contracts = [
    {
      name: "LuckySpinFHE_Simple",
      address: "0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2"
    },
    {
      name: "LuckySpinFHE_ACL_Simple", 
      address: "0xE334A43F3eb88eAf1CaeE6Fa64873feB94D7588A"
    }
  ];

  for (const contractInfo of contracts) {
    console.log(`\n📋 Checking ${contractInfo.name} at ${contractInfo.address}`);
    console.log("=".repeat(60));

    try {
      // Get contract code
      const code = await ethers.provider.getCode(contractInfo.address);
      
      if (code === "0x") {
        console.log("❌ Contract not deployed or no code at address");
        continue;
      }

      console.log("✅ Contract code found at address");

      // Try to get contract instance
      let contract;
      try {
        if (contractInfo.name === "LuckySpinFHE_Simple") {
          const LuckySpinFHE_Simple = await ethers.getContractFactory("LuckySpinFHE_Simple");
          contract = LuckySpinFHE_Simple.attach(contractInfo.address);
        } else if (contractInfo.name === "LuckySpinFHE_ACL_Simple") {
          const LuckySpinFHE_ACL_Simple = await ethers.getContractFactory("LuckySpinFHE_ACL_Simple");
          contract = LuckySpinFHE_ACL_Simple.attach(contractInfo.address);
        }
      } catch (error) {
        console.log("⚠️ Could not create contract instance:", error.message);
        continue;
      }

      if (!contract) {
        console.log("❌ Contract instance creation failed");
        continue;
      }

      console.log("✅ Contract instance created successfully");

      // Test basic functions
      const tests = [
        { name: "owner", test: () => contract.owner() },
        { name: "SPIN_PRICE", test: () => contract.SPIN_PRICE() },
        { name: "GM_TOKEN_RATE", test: () => contract.GM_TOKEN_RATE() },
        { name: "getContractBalance", test: () => contract.getContractBalance() },
        { name: "aclHost", test: () => contract.aclHost() }
      ];

      for (const test of tests) {
        try {
          const result = await test.test();
          console.log(`✅ ${test.name}: ${result}`);
        } catch (error) {
          console.log(`❌ ${test.name}: ${error.message}`);
        }
      }

      // Check if it's an ACL contract
      try {
        const aclHost = await contract.aclHost();
        console.log(`🔐 ACL Host: ${aclHost}`);
        
        // Test ACL functions
        const aclTests = [
          { name: "isUserAuthorized", test: () => contract.isUserAuthorized("0xE24546D5Ff7bf460Ebdaa36847e38669996D1a0D") },
          { name: "isRelayerAuthorized", test: () => contract.isRelayerAuthorized("0xE24546D5Ff7bf460Ebdaa36847e38669996D1a0D") }
        ];

        for (const test of aclTests) {
          try {
            const result = await test.test();
            console.log(`✅ ${test.name}: ${result}`);
          } catch (error) {
            console.log(`❌ ${test.name}: ${error.message}`);
          }
        }
      } catch (error) {
        console.log("ℹ️ Not an ACL contract or ACL functions not available");
      }

    } catch (error) {
      console.error(`❌ Error checking ${contractInfo.name}:`, error.message);
    }
  }

  console.log("\n🏁 Contract verification completed!");
}

verifyContractStatus()
  .then(() => {
    console.log("✅ Verification completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
