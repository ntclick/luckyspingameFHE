# 🎰 Lucky Spin FHEVM Demo

A secure, verifiable spinning wheel game built with **Zama FHEVM** (Fully Homomorphic Encryption Virtual Machine) that provides confidential rewards and private gameplay.

## 🌟 Features

### 🔐 **Privacy-First Design**
- **Encrypted Game State**: All player data (spins, GM tokens, pending ETH, scores) are encrypted on-chain
- **Private Transactions**: Game actions are performed with encrypted inputs
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
git clone https://github.com/your-username/gmspin.git
cd gmspin
```

2. **Install dependencies**
```bash
cd frontend-fhe-spin
npm install
```

3. **Configure environment**
```bash
# Copy .env.example to .env
cp .env.example .env

# Update with your configuration
REACT_APP_FHEVM_CONTRACT_ADDRESS=0x561D05BbaE5a2D93791151D02393CcD26d9749a2
REACT_APP_RELAYER_URL=https://relayer.testnet.zama.cloud
```

4. **Start the application**
```bash
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

## 🔧 Smart Contract

### Contract Address
```
Sepolia: 0x561D05BbaE5a2D93791151D02393CcD26d9749a2
```

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
gmspin/
├── contracts/
│   └── LuckySpinFHE_KMS_Final.sol    # Main smart contract
├── frontend-fhe-spin/
│   ├── src/
│   │   ├── App.tsx                   # Main React component
│   │   ├── hooks/
│   │   │   └── useUserGameState.ts   # Game state management
│   │   ├── utils/
│   │   │   └── fheUtils.ts           # FHE utilities
│   │   └── config.ts                 # Configuration
│   └── public/
├── deploy/
│   └── 06b_deploy_kms_final_js.js   # Deployment script
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

# Build for production
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
- **ABI**: Available in `frontend-fhe-spin/src/utils/fheUtils.ts`

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

- **Issues**: [GitHub Issues](https://github.com/your-username/gmspin/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/gmspin/discussions)
- **Author**: [@trungkts29](https://x.com/trungkts29)

---

**⚠️ Disclaimer**: This is a demo application for educational purposes. Use at your own risk and never use real funds on testnet applications.
