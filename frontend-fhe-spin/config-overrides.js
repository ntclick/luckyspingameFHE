/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require("webpack");

module.exports = function override(config) {
  // Ensure resolve exists
  config.resolve = config.resolve || {};

  // Node polyfills for Webpack 5
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer/"),
    util: require.resolve("util/"),
    path: require.resolve("path-browserify"),
    url: require.resolve("url/"),
    assert: require.resolve("assert/"),
  };

  // Provide globals
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    }),
  ]);

  return config;
};
