const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/relayer",
    createProxyMiddleware({
      target: "https://relayer.testnet.zama.cloud",
      changeOrigin: true,
      // Strip the /relayer prefix so upstream receives /v1/... paths
      pathRewrite: {
        "^/relayer": "",
      },
      secure: true,
      onProxyReq: function (proxyReq, req, res) {
        // Log proxy requests for debugging
        console.log(
          `🔀 Proxying ${req.method} ${req.originalUrl} -> ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`,
        );
      },
      onError: function (err, req, res) {
        console.error("❌ Proxy error:", err.message);
        res.writeHead(500, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ error: "Proxy error", message: err.message }));
      },
    }),
  );

  // Backend attestation/API proxy
  const backend = process.env.BACKEND_TARGET || "http://localhost:4009";
  app.use(
    "/api",
    createProxyMiddleware({
      target: backend,
      changeOrigin: true,
      pathRewrite: {
        "^/api": "",
      },
      onProxyReq: function (proxyReq, req, res) {
        console.log(
          `🛡️  API Proxy ${req.method} ${req.originalUrl} -> ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`,
        );
      },
      onError: function (err, req, res) {
        console.error("❌ API proxy error:", err.message);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "API proxy error", message: err.message }));
      },
    }),
  );
};
