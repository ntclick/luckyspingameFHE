// Script set attestor address trong contract
// Chạy: node scripts/set-attestor.js [ATTESTOR_ADDRESS]

const { ethers } = require('ethers');
require('dotenv').config();

async function setAttestor(attestorAddress) {
  if (!attestorAddress) {
    console.error('❌ Vui lòng cung cấp attestor address');
    console.log('Usage: node scripts/set-attestor.js [ATTESTOR_ADDRESS]');
    return;
  }

  console.log('🔧 Set Attestor trong Contract...\n');
  
  // Cấu hình network
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  // Contract address và ABI
  const contractAddress = process.env.FHEVM_CONTRACT_ADDRESS || '0x85c56f386DD4E56C96a9176f1A44D4294264E907';
  const contractABI = [
    'function setAttestor(address _attestor) external',
    'function attestor() external view returns (address)'
  ];
  
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);
  
  try {
    // Check current attestor
    const currentAttestor = await contract.attestor();
    console.log(`📋 Attestor hiện tại: ${currentAttestor}`);
    
    if (currentAttestor.toLowerCase() === attestorAddress.toLowerCase()) {
      console.log('✅ Attestor đã được set đúng rồi!');
      return;
    }
    
    // Set new attestor
    console.log(`🔄 Đang set attestor mới: ${attestorAddress}`);
    const tx = await contract.setAttestor(attestorAddress);
    console.log(`⏳ Transaction hash: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed! Block: ${receipt.blockNumber}`);
    
    // Verify
    const newAttestor = await contract.attestor();
    console.log(`✅ Attestor mới: ${newAttestor}`);
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
}

// Lấy attestor address từ command line
const attestorAddress = process.argv[2];
setAttestor(attestorAddress).catch(console.error);
