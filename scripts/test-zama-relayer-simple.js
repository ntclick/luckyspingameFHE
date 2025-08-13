const https = require("https");
const http = require("http");

async function testZamaRelayer() {
  const relayerUrl = "https://relayer.testnet.zama.cloud";

  console.log("🔍 Testing Zama Relayer Status...");
  console.log(`URL: ${relayerUrl}`);
  console.log("─".repeat(50));

  // Test 1: Basic connectivity
  console.log("1. Testing basic connectivity...");
  try {
    const response = await makeRequest(relayerUrl, "GET");
    console.log(`✅ Status Code: ${response.statusCode}`);
    console.log(`✅ Response Headers: ${Object.keys(response.headers).join(", ")}`);
    console.log(`✅ Response Body Length: ${response.body ? response.body.length : 0} characters`);
  } catch (error) {
    console.log("❌ Basic connectivity test failed:");
    console.log(`   Error: ${error.message}`);
  }

  // Test 2: Health endpoint
  console.log("\n2. Testing health endpoint...");
  try {
    const healthResponse = await makeRequest(`${relayerUrl}/health`, "GET");
    console.log(`✅ Health Status: ${healthResponse.statusCode}`);
    console.log(`✅ Health Response: ${healthResponse.body}`);
  } catch (error) {
    console.log("❌ Health endpoint test failed:");
    console.log(`   Error: ${error.message}`);
  }

  // Test 3: Response time
  console.log("\n3. Testing response time...");
  const startTime = Date.now();
  try {
    await makeRequest(relayerUrl, "GET");
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
    console.log(`   Error: ${error.message}`);
  }

  console.log("\n📊 Summary:");
  console.log("─".repeat(50));
  console.log("The Zama relayer appears to be operational.");
  console.log("If you see mostly ✅ marks above, the relayer is working.");
  console.log("If you see ❌ marks, there may be connectivity issues.");
  console.log("\nFor production use, ensure you have proper authentication.");
}

function makeRequest(url, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        "User-Agent": "Zama-Relayer-Test/1.0",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 10000,
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers["Content-Length"] = Buffer.byteLength(jsonData);
    }

    const client = urlObj.protocol === "https:" ? https : http;

    const req = client.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Run the test
testZamaRelayer().catch(console.error);
