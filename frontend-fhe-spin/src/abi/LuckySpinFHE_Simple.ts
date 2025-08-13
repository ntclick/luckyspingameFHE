// ✅ LuckySpinFHE_ACL_Simple Contract ABI for ethers.js v6 - Matches deployed ACL contract
export const LUCKY_SPIN_ABI = [
  {
    inputs: [{ internalType: "address", name: "_aclHost", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "DailyGmCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "GmTokensBought",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "string", name: "result", type: "string" },
    ],
    name: "SpinCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "SpinPurchased",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "user", type: "address" }],
    name: "UserAuthorized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "user", type: "address" }],
    name: "UserDeauthorized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "relayer", type: "address" }],
    name: "RelayerAuthorized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "relayer", type: "address" }],
    name: "RelayerDeauthorized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "oldHost", type: "address" },
      { indexed: false, internalType: "address", name: "newHost", type: "address" },
    ],
    name: "AclHostUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "score", type: "uint256" },
    ],
    name: "ScorePublished",
    type: "event",
  },

  // Constants
  {
    inputs: [],
    name: "DAILY_GM_RESET_HOUR",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "GM_TOKEN_RATE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SECONDS_PER_DAY",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SPIN_PRICE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },

  // Basic views
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "aclHost",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },

  // ACL mgmt
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "authorizeUser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "deauthorizeUser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "relayer", type: "address" }],
    name: "authorizeRelayer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "relayer", type: "address" }],
    name: "deauthorizeRelayer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newHost", type: "address" }],
    name: "updateAclHost",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // Core TX
  {
    inputs: [
      { internalType: "externalEuint64", name: "encryptedAmount", type: "bytes32" },
      { internalType: "bytes", name: "proof", type: "bytes" },
    ],
    name: "buySpins",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "externalEuint64", name: "encryptedAmount", type: "bytes32" },
      { internalType: "bytes", name: "proof", type: "bytes" },
    ],
    name: "buyGmTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "externalEuint64", name: "encryptedGmValue", type: "bytes32" },
      { internalType: "bytes", name: "proof", type: "bytes" },
    ],
    name: "dailyGm",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [], name: "spin", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "claimETH", outputs: [], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [{ internalType: "uint256", name: "score", type: "uint256" }],
    name: "publishScore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // Views
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserSpins",
    outputs: [{ internalType: "euint64", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserRewards",
    outputs: [{ internalType: "euint256", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserGmBalance",
    outputs: [{ internalType: "euint64", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "canGmToday",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getLastGmTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getTimeUntilNextGm",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getDailyStatus",
    outputs: [
      { internalType: "bool", name: "canGm", type: "bool" },
      { internalType: "uint256", name: "timeUntilNext", type: "uint256" },
      { internalType: "uint256", name: "lastGm", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getContractBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "weiAmount", type: "uint256" }],
    name: "previewSpinsFromEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "weiAmount", type: "uint256" }],
    name: "previewGmFromEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },

  // Admin
  { inputs: [], name: "emergencyWithdraw", outputs: [], stateMutability: "nonpayable", type: "function" },

  // Receive
  { stateMutability: "payable", type: "receive" },
] as const;
