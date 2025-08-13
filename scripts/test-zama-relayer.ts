import axios from "axios";

async function testZamaRelayer() {
  const relayerUrl = "https://relayer.testnet.zama.cloud";

  console.log("🔍 Testing Zama Relayer Status...");
  console.log(`URL: ${relayerUrl}`);
  console.log("─".repeat(50));

  try {
    // Test 1: Basic connectivity
    console.log("1. Testing basic connectivity...");
    const response = await axios.get(relayerUrl, {
      timeout: 10000,
      headers: {
        "User-Agent": "Zama-Relayer-Test/1.0",
      },
    });

    console.log(`✅ Status Code: ${response.status}`);
    console.log(`✅ Response Headers:`, Object.keys(response.headers));

    if (response.data) {
      console.log(`✅ Response Data Type: ${typeof response.data}`);
      if (typeof response.data === "object") {
        console.log(`✅ Response Keys: ${Object.keys(response.data).join(", ")}`);
      }
    }
  } catch (error: any) {
    console.log("❌ Basic connectivity test failed:");
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Status Text: ${error.response.statusText}`);
      console.log(`   Headers:`, error.response.headers);
    } else if (error.request) {
      console.log(`   Network Error: ${error.message}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log("\n2. Testing health endpoint...");
  try {
    const healthResponse = await axios.get(`${relayerUrl}/health`, {
      timeout: 10000,
    });
    console.log(`✅ Health Status: ${healthResponse.status}`);
    console.log(`✅ Health Data:`, healthResponse.data);
  } catch (error: any) {
    console.log("❌ Health endpoint test failed:");
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log("\n3. Testing with POST request...");
  try {
    const postResponse = await axios.post(
      `${relayerUrl}/`,
      {
        test: "data",
      },
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    console.log(`✅ POST Status: ${postResponse.status}`);
  } catch (error: any) {
    console.log("❌ POST test failed:");
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log("\n4. Testing CORS headers...");
  try {
    const corsResponse = await axios.options(relayerUrl, {
      timeout: 10000,
      headers: {
        Origin: "https://example.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
      },
    });
    console.log(`✅ CORS Status: ${corsResponse.status}`);
    console.log(`✅ CORS Headers:`, corsResponse.headers);
  } catch (error: any) {
    console.log("❌ CORS test failed:");
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log("\n5. Testing response time...");
  const startTime = Date.now();
  try {
    await axios.get(relayerUrl, { timeout: 30000 });
    const responseTime = Date.now() - startTime;
    console.log(`✅ Response Time: ${responseTime}ms`);

    if (responseTime < 1000) {
      console.log("✅ Excellent response time (< 1s)");
    } else if (responseTime < 5000) {
      console.log("✅ Good response time (< 5s)");
    } else {
      console.log("⚠️  Slow response time (> 5s)");
    }
  } catch (error) {
    console.log("❌ Response time test failed");
  }

  console.log("\n📊 Summary:");
  console.log("─".repeat(50));
  console.log("The Zama relayer appears to be operational.");
  console.log("If you see mostly ✅ marks above, the relayer is working.");
  console.log("If you see ❌ marks, there may be connectivity issues.");
  console.log("\nFor production use, ensure you have proper authentication.");
}

// Run the test
testZamaRelayer().catch(console.error);
