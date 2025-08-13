# 🚀 Lucky Spin FHE - Deployment Guide

Hướng dẫn deploy dự án Lucky Spin FHE lên production.

## 📁 Cấu trúc Dự án

```
luckyspingameFHE/
├── README.md                    # Tài liệu chính
├── LICENSE                      # Giấy phép
├── package.json                 # Hardhat dependencies
├── hardhat.config.ts           # Cấu hình blockchain
├── tsconfig.json               # TypeScript config
├── .env.example                # Mẫu biến môi trường
├── contracts/                  # Smart contracts
│   ├── LuckySpinFHE_KMS_Final.sol    # Contract chính
│   ├── LuckySpinFHE_Strict.sol       # Contract backup
│   └── LuckySpinFHE_ACL_Simple.sol   # Contract test
├── deploy/                     # Scripts deploy
│   ├── 06b_deploy_kms_final_js.js   # Deploy contract chính
│   ├── 06_LuckySpinFHE_KMS_Final.ts
│   └── 03_LuckySpinFHE_Strict.ts
├── scripts/                    # Scripts utility
│   ├── deploy-strict.ts
│   ├── fund-contract.js
│   ├── set-oracle-attestor.js
│   └── ... (nhiều scripts khác)
├── frontend-fhe-spin/          # React Frontend
│   ├── package.json
│   ├── .env.example
│   ├── .gitignore
│   ├── src/
│   │   ├── App.tsx
│   │   ├── config.ts
│   │   ├── setupProxy.js
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── abi/
│   │   └── types/
│   ├── public/
│   │   ├── wasm/               # FHE WASM files
│   │   └── index.html
│   └── api/
└── server/                     # Express Backend
    ├── package.json
    ├── index.js
    ├── .env.example
    └── .gitignore
```

## 🔧 Chuẩn bị Deploy

### 1. Cấu hình Environment Variables

#### Frontend (.env)
```env
# Contract Configuration
REACT_APP_FHEVM_CONTRACT_ADDRESS=0x561D05BbaE5a2D93791151D02393CcD26d9749a2

# Network Configuration
REACT_APP_SEPOLIA_RPC_URL=https://rpc.sepolia.org
REACT_APP_CHAIN_ID=11155111

# FHEVM Configuration
REACT_APP_RELAYER_URL=https://relayer.testnet.zama.cloud

# Backend API
REACT_APP_BACKEND_API_URL=/api

# Optional
REACT_APP_ETHERSCAN_API_KEY=your_etherscan_api_key
```

#### Backend (.env)
```env
# Server Configuration
PORT=4009

# Network Configuration
REACT_APP_SEPOLIA_RPC_URL=https://rpc.sepolia.org
REACT_APP_ETHERSCAN_API_KEY=your_etherscan_api_key

# FHEVM Configuration
REACT_APP_RELAYER_URL=https://relayer.testnet.zama.cloud
REACT_APP_DECRYPTION_ADDRESS=0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1
REACT_APP_FHEVM_CONTRACT_ADDRESS=0x561D05BbaE5a2D93791151D02393CcD26d9749a2

# Oracle Configuration
ORACLE_PRIVATE_KEY=your_oracle_private_key

# Optional
REPORT_USER_PRIVATE_KEY=your_user_private_key
```

### 2. Deploy Smart Contract

```bash
# Compile contracts
npx hardhat compile

# Deploy main contract
npx hardhat run deploy/06b_deploy_kms_final_js.js --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

### 3. Fund Contract Pool

```bash
# Fund contract with ETH for prizes
npx hardhat run scripts/fund-contract.js --network sepolia

# Set oracle attestor
npx hardhat run scripts/set-oracle-attestor.js --network sepolia
```

## 🚀 Deploy Production

### Frontend Deployment

#### Vercel (Recommended)
1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import from GitHub: `ntclick/luckyspingameFHE`
   - Set root directory: `frontend-fhe-spin`

2. **Configure Build Settings**
   ```
   Build Command: npm run build
   Output Directory: build
   Install Command: npm install
   ```

3. **Set Environment Variables**
   - Add all variables from `frontend-fhe-spin/.env.example`
   - Update `REACT_APP_BACKEND_API_URL` to your backend URL

4. **Deploy**
   - Click "Deploy"
   - Vercel will auto-deploy on every push

#### Netlify
1. **Connect Repository**
   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Click "New site from Git"
   - Connect to GitHub repository
   - Set build command: `cd frontend-fhe-spin && npm run build`
   - Set publish directory: `frontend-fhe-spin/build`

2. **Set Environment Variables**
   - Go to Site settings > Environment variables
   - Add all variables from `frontend-fhe-spin/.env.example`

### Backend Deployment

#### Render (Recommended)
1. **Create New Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New Web Service"
   - Connect to GitHub repository
   - Set root directory: `server`

2. **Configure Service**
   ```
   Build Command: npm install
   Start Command: npm start
   Environment: Node
   ```

3. **Set Environment Variables**
   - Add all variables from `server/.env.example`
   - Set `PORT` to 10000 (Render requirement)

4. **Deploy**
   - Click "Create Web Service"
   - Render will auto-deploy on every push

#### Railway
1. **Create New Service**
   - Go to [Railway Dashboard](https://railway.app/)
   - Click "New Project"
   - Connect to GitHub repository
   - Set root directory: `server`

2. **Configure Service**
   ```
   Build Command: npm install
   Start Command: npm start
   ```

3. **Set Environment Variables**
   - Add all variables from `server/.env.example`

#### Fly.io
1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Deploy**
   ```bash
   cd server
   fly launch
   fly deploy
   ```

3. **Set Environment Variables**
   ```bash
   fly secrets set PORT=8080
   fly secrets set REACT_APP_SEPOLIA_RPC_URL=https://rpc.sepolia.org
   # ... add all other variables
   ```

## 🔄 Update Frontend Backend URL

Sau khi deploy backend, cập nhật frontend:

### Vercel
1. Go to Project Settings > Environment Variables
2. Update `REACT_APP_BACKEND_API_URL`:
   - Render: `https://your-app.onrender.com`
   - Railway: `https://your-app.railway.app`
   - Fly.io: `https://your-app.fly.dev`

### Netlify
1. Go to Site settings > Environment variables
2. Update `REACT_APP_BACKEND_API_URL`

## 🧪 Testing Deployment

### 1. Test Frontend
- Open deployed frontend URL
- Connect MetaMask to Sepolia
- Test daily check-in
- Test spin wheel
- Test GM token purchase

### 2. Test Backend
```bash
# Test health endpoint
curl https://your-backend-url.com/health

# Test user state endpoint
curl "https://your-backend-url.com/api/user/0x123.../state?contract=0x561D05BbaE5a2D93791151D02393CcD26d9749a2"
```

### 3. Test Smart Contract
```bash
# Check contract balance
npx hardhat run scripts/check-contract-balance.ts --network sepolia

# Test spin functionality
npx hardhat run scripts/spin-lite-and-settle.js --network sepolia
```

## 🔧 Troubleshooting

### Frontend Issues
- **"Failed to fetch"**: Check `REACT_APP_BACKEND_API_URL`
- **"Contract not found"**: Verify `REACT_APP_FHEVM_CONTRACT_ADDRESS`
- **"Network error"**: Check `REACT_APP_SEPOLIA_RPC_URL`

### Backend Issues
- **"Port already in use"**: Change `PORT` in environment
- **"Etherscan API error"**: Verify `REACT_APP_ETHERSCAN_API_KEY`
- **"Relayer error"**: Check `REACT_APP_RELAYER_URL`

### Contract Issues
- **"Insufficient funds"**: Fund contract with ETH
- **"Oracle not set"**: Run `set-oracle-attestor.js`
- **"ACL error"**: Check user permissions

## 📊 Monitoring

### Frontend Monitoring
- Vercel Analytics
- Google Analytics
- Error tracking (Sentry)

### Backend Monitoring
- Render/Railway logs
- Application logs
- Error tracking

### Contract Monitoring
- Etherscan contract page
- Event logs
- Balance monitoring

## 🔒 Security Checklist

- [ ] Environment variables not committed to Git
- [ ] Private keys secured
- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] Rate limiting implemented
- [ ] Input validation
- [ ] Error handling
- [ ] Logging configured

## 📈 Performance Optimization

### Frontend
- Enable gzip compression
- Optimize images
- Use CDN for static assets
- Implement caching

### Backend
- Enable compression
- Implement caching
- Optimize database queries
- Use connection pooling

### Contract
- Optimize gas usage
- Batch operations
- Use events for logging

## 🎯 Production Checklist

- [ ] Smart contract deployed and verified
- [ ] Contract funded with ETH
- [ ] Oracle configured
- [ ] Frontend deployed
- [ ] Backend deployed
- [ ] Environment variables set
- [ ] Domain configured
- [ ] SSL certificate installed
- [ ] Monitoring configured
- [ ] Error tracking set up
- [ ] Performance optimized
- [ ] Security audit completed
- [ ] User testing completed

## 📞 Support

- **GitHub Issues**: [Create Issue](https://github.com/ntclick/luckyspingameFHE/issues)
- **Documentation**: [README.md](README.md)
- **Author**: [@ntclick](https://github.com/ntclick)

---

**🚀 Happy Deploying!** 🎰
