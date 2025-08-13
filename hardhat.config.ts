// import "@fhevm/hardhat-plugin";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
// import type { HardhatUserConfig } from "hardhat";
// import { vars } from "hardhat";
import "solidity-coverage";
import * as dotenv from "dotenv";

// import "./tasks/accounts";
// import "./tasks/FHECounter";
// import "./tasks/LuckySpinFHE";
// import { ZAMA_CONFIG, NETWORK_CONFIG, HARDHAT_CONFIG } from "./config/zama-config";

// Load environment variables
dotenv.config();

// Run 'npx hardhat vars setup' to see the list of variables that need to be set

const MNEMONIC: string = "test test test test test test test test test test test junk";
const INFURA_API_KEY: string = "";

// Get environment variables
const VITE_PRIVATE_KEY = process.env.VITE_PRIVATE_KEY || process.env.REACT_APP_PRIVATE_KEY || "";
const VITE_SEPOLIA_RPC_URL = process.env.VITE_SEPOLIA_RPC_URL || process.env.REACT_APP_SEPOLIA_RPC_URL || "";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      sepolia: "SMYU9ZMV9DB55ZAFPW5JKN56S52RVBIWX6",
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 31337,
    },
    anvil: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 31337,
      url: "http://localhost:8545",
    },
    sepolia: {
      accounts: VITE_PRIVATE_KEY ? [VITE_PRIVATE_KEY] : [],
      chainId: 11155111,
      url: VITE_SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/oppYpzscO7hdTG6hopypG6Opn3Xp7lR_",
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 1000,
        details: {
          yul: true,
        },
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  // plugins: ["@fhevm/hardhat-plugin"],
};

export default config;
