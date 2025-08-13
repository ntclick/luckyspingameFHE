const http = require("http");

// Test proxy endpoint
const testProxy = () => {
  const options = {
    hostname: "localhost",
    port: 4002,
    path: "/relayer/",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Test-Proxy/1.0",
    },
  };

  console.log("🔍 Testing proxy path:", options.path);

  const req = http.request(options, (res) => {
    console.log(`🔍 Proxy test status: ${res.statusCode}`);
    console.log(`🔍 Proxy test headers:`, res.headers);

    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log(`🔍 Proxy test response:`, data.substring(0, 200) + "...");
    });
  });

  req.on("error", (e) => {
    console.error(`❌ Proxy test error:`, e.message);
  });

  req.end();
};

console.log("🧪 Testing proxy...");
testProxy();

// Test direct relayer
const testDirectRelayer = () => {
  const https = require('https');
  
  const options = {
    hostname: "relayer.testnet.zama.cloud",
    port: 443,
    path: "/v1/public-key",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Test-Direct/1.0",
    },
  };

  console.log("🔍 Testing direct relayer path:", options.path);

  const req = https.request(options, (res) => {
    console.log(`🔍 Direct relayer test status: ${res.statusCode}`);
    console.log(`🔍 Direct relayer test headers:`, res.headers);

    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log(`🔍 Direct relayer test response:`, data.substring(0, 200) + "...");
    });
  });

  req.on("error", (e) => {
    console.error(`❌ Direct relayer test error:`, e.message);
  });

  req.end();
};

setTimeout(() => {
  console.log("\n🧪 Testing direct relayer...");
  testDirectRelayer();
}, 1000);
