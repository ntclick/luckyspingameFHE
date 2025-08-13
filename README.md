# 🎰 Lucky Spin FHE - Privacy-First Blockchain Game

A secure, verifiable spinning wheel game built with **Zama FHEVM** (Fully Homomorphic Encryption Virtual Machine) that provides confidential rewards and private gameplay on Ethereum blockchain.

## 🌟 Features

### 🔐 **Privacy-First Design**
- **Encrypted Game State**: All player data (spins, GM tokens, pending ETH, scores) are encrypted on-chain
- **Private Transactions**: Game actions are performed with encrypted inputs using FHE
- **Zero-Knowledge Proofs**: Verifiable gameplay without revealing outcomes
- **User-Decrypt Authorization**: Players control their own data decryption

### 🎮 **Game Mechanics**
- **Daily Check-in**: Receive +1 spin daily (resets at 00:00 UTC)
- **GM Token System**: Buy GM tokens with ETH (1 ETH = 1000 GM)
- **Spin Rewards**: 
  - Slot 0: 0.1 ETH (1% chance)
  - Slot 1: 0.01 ETH (1% chance)  
  - Slots 2-4: Miss (no reward)
  - Slot 5: 5 GM tokens
  - Slot 6: 15 GM tokens
  - Slot 7: 30 GM tokens
- **Leaderboard**: Publish scores to compete with other players
- **KMS Claim System**: Decentralized ETH claiming with Key Management Service

### 🏗️ **Technical Architecture**
- **Smart Contract**: `LuckySpinFHE_KMS_Final.sol` - Optimized for HCU efficiency
- **Frontend**: React + TypeScript with FHE SDK integration
- **Backend**: Express.js API for state aggregation and oracle services
- **Relayer**: Zama Relayer for encrypted transaction processing
- **Network**: Sepolia Testnet (Ethereum)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MetaMask wallet
- Sepolia ETH for gas fees

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ntclick/luckyspingameFHE.git
cd luckyspingameFHE
```

2. **Install dependencies**
```bash
# Frontend dependencies
cd frontend-fhe-spin
npm install

# Backend dependencies
cd ../server
npm install
```

3. **Configure environment**
```bash
# Frontend configuration
cd frontend-fhe-spin
cp .env.example .env
# Edit .env with your configuration

# Backend configuration  
cd ../server
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the application**
```bash
# Start backend (Terminal 1)
cd server
npm start

# Start frontend (Terminal 2)
cd frontend-fhe-spin
npm start
```

5. **Connect your wallet**
- Open MetaMask and connect to Sepolia Testnet
- Connect your wallet to the application
- Grant user-decrypt authorization when prompted

## 🎯 How to Play

### 1. **Get Started**
- Connect your MetaMask wallet
- Perform daily check-in to receive free spins
- Buy GM tokens if you need more spins

### 2. **Spin the Wheel**
- Click the spin wheel to start
- Wait for the wheel to stop and reveal your outcome
- Prizes are automatically settled on-chain

### 3. **Claim Rewards**
- **GM Tokens**: Automatically added to your balance
- **ETH Rewards**: Use the "Claim ETH" button to withdraw to your wallet
- **Leaderboard**: Publish your score to compete with others

### 4. **Troubleshooting**
- **"Repair Permissions"**: Fix ACL issues if data doesn't load
- **"Force Refresh"**: Manually reload your game state
- **Check contract balance**: Ensure the pool has sufficient ETH for prizes

## 🔧 Smart Contracts

### Contract Addresses
```
Sepolia: 0x561D05BbaE5a2D93791151D02393CcD26d9749a2 (LuckySpinFHE_KMS_Final)
```

### Available Contracts
1. **`LuckySpinFHE_KMS_Final.sol`** - Main production contract with KMS integration
2. **`LuckySpinFHE_Strict.sol`** - Backup contract for testing
3. **`LuckySpinFHE_ACL_Simple.sol`** - ACL testing contract

### Key Functions

#### **Game Actions**
- `spinLite()` - Consume a spin and compute outcome
- `settlePrize(uint8 slot)` - Apply rewards for a specific slot
- `dailyGm()` - Daily check-in for free spins
- `buyGmTokensFHE(bytes32 handle, bytes calldata inputProof)` - Buy GM tokens with ETH

#### **KMS Claim System**
- `requestClaimETH(uint256 amountWei)` - Request ETH withdrawal
- `onClaimDecrypted(address user, uint256 amountWei)` - KMS callback for actual transfer

#### **Data Access**
- `getUserSpins(address user)` - Get encrypted spin count
- `getUserGmBalance(address user)` - Get encrypted GM balance  
- `getEncryptedPendingEthWei(address user)` - Get encrypted pending ETH
- `getEncryptedScore(address user)` - Get encrypted score

### HCU Optimization
The contract is optimized for minimal Homomorphic Computation Units (HCU) usage:
- `spinLite()`: Lightweight spin (consumes spin, computes outcome, creates commitment)
- `settlePrize()`: Applies rewards separately to reduce HCU per transaction
- Batch operations for efficiency

## 🛠️ Development

### Project Structure
```
luckyspingameFHE/
├── contracts/
│   ├── LuckySpinFHE_KMS_Final.sol    # Main smart contract
│   ├── LuckySpinFHE_Strict.sol       # Backup contract
│   └── LuckySpinFHE_ACL_Simple.sol   # ACL test contract
├── frontend-fhe-spin/
│   ├── src/
│   │   ├── App.tsx                   # Main React component
│   │   ├── components/
│   │   │   ├── SpinWheel.tsx         # Spinning wheel UI
│   │   │   ├── NetworkWarning.tsx    # Network status
│   │   │   └── Toast.tsx             # Notifications
│   │   ├── hooks/
│   │   │   ├── useFheSdk.ts          # FHE SDK integration
│   │   │   └── useUserGameState.ts   # Game state management
│   │   ├── utils/
│   │   │   ├── fheUtils.ts           # FHE utilities
│   │   │   └── networkUtils.ts       # Network utilities
│   │   ├── abi/                      # Contract ABIs
│   │   └── config.ts                 # Configuration
│   └── public/
│       └── wasm/                     # FHE WASM files
├── server/
│   ├── index.js                      # Express API server
│   └── package.json
├── deploy/                           # Deployment scripts
├── scripts/                          # Utility scripts
└── README.md
```

### Key Technologies

#### **Frontend**
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Ethers.js** - Ethereum interaction
- **Zama FHE SDK** - Encrypted operations

#### **Smart Contract**
- **Solidity** - Smart contract language
- **FHE Solidity** - Homomorphic encryption
- **Hardhat** - Development framework

#### **Infrastructure**
- **Zama Relayer** - Encrypted transaction processing
- **MetaMask** - Wallet connection
- **Sepolia Testnet** - Ethereum test network

### Development Commands

```bash
# Compile contracts
npx hardhat compile

# Deploy to Sepolia
npx hardhat run deploy/06b_deploy_kms_final_js.js --network sepolia

# Start frontend
cd frontend-fhe-spin
npm start

# Start backend
cd server
npm start

# Build for production
cd frontend-fhe-spin
npm run build
```

## 🔒 Security Features

### **Encryption**
- All sensitive data encrypted on-chain using FHE
- User controls decryption through UDSIG (User Decryption Signature)
- No plaintext data stored on-chain

### **Access Control**
- ACL (Access Control List) system for data permissions
- User-decrypt authorization required for data access
- Contract-level permission management

### **Verification**
- EIP-712 signatures for secure authorization
- Input proofs for encrypted transaction validation
- Commitment scheme for spin outcomes

## 🌐 Network Configuration

### Sepolia Testnet
- **RPC URL**: `https://rpc.sepolia.org`
- **Chain ID**: 11155111
- **Block Explorer**: https://sepolia.etherscan.io
- **Faucet**: https://sepoliafaucet.com

### Contract Verification
- **Etherscan**: https://sepolia.etherscan.io/address/0x561D05BbaE5a2D93791151D02393CcD26d9749a2
- **ABI**: Available in `frontend-fhe-spin/src/abi/`

## 📋 Environment Variables

### Frontend (.env)
```env
REACT_APP_FHEVM_CONTRACT_ADDRESS=0x561D05BbaE5a2D93791151D02393CcD26d9749a2
REACT_APP_SEPOLIA_RPC_URL=https://rpc.sepolia.org
REACT_APP_CHAIN_ID=11155111
REACT_APP_RELAYER_URL=https://relayer.testnet.zama.cloud
REACT_APP_BACKEND_API_URL=/api
REACT_APP_ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Backend (.env)
```env
PORT=4009
REACT_APP_SEPOLIA_RPC_URL=https://rpc.sepolia.org
REACT_APP_ETHERSCAN_API_KEY=your_etherscan_api_key
REACT_APP_RELAYER_URL=https://relayer.testnet.zama.cloud
REACT_APP_DECRYPTION_ADDRESS=0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1
REACT_APP_FHEVM_CONTRACT_ADDRESS=0x561D05BbaE5a2D93791151D02393CcD26d9749a2
ORACLE_PRIVATE_KEY=your_oracle_private_key
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Connect repository to Vercel/Netlify
2. Set environment variables
3. Deploy automatically on push

### Backend (Render/Fly.io)
1. Deploy server to cloud platform
2. Set environment variables
3. Update frontend `REACT_APP_BACKEND_API_URL`

### Smart Contract
```bash
# Deploy to Sepolia
npx hardhat run deploy/06b_deploy_kms_final_js.js --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add proper error handling
- Include comprehensive tests
- Update documentation for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Zama Team** - For the amazing FHEVM technology
- **Ethereum Foundation** - For the blockchain infrastructure
- **MetaMask** - For wallet integration
- **Hardhat** - For development tools

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ntclick/luckyspingameFHE/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ntclick/luckyspingameFHE/discussions)
- **Author**: [@ntclick](https://github.com/ntclick)

---

**⚠️ Disclaimer**: This is a demo application for educational purposes. Use at your own risk and never use real funds on testnet applications.
#   T r i g g e r   V e r c e l   R e d e p l o y  
 