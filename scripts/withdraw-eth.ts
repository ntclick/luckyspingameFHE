import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0xa70DFA470B27d1Db1612E64c8Fb8c094FB3202E7"; // Địa chỉ contract đã deploy
  const poolIndex = 0; // Pool ETH
  const amount = ethers.parseEther("0.1"); // 0.1 ETH

  // Lấy instance contract
  const LuckySpinFHE_Complete = await ethers.getContractFactory("LuckySpinFHE_Complete");
  const luckySpinFHE = LuckySpinFHE_Complete.attach(contractAddress);

  // Lấy signer admin
  const [admin] = await ethers.getSigners();
  console.log(`👤 Admin: ${admin.address}`);

  // Số dư trước khi rút
  const before = await ethers.provider.getBalance(admin.address);
  console.log(`💰 Số dư trước khi rút: ${ethers.formatEther(before)} ETH`);

  // Thực hiện rút
  const tx = await luckySpinFHE.withdrawFromPool(poolIndex, amount);
  await tx.wait();
  console.log(`✅ Đã rút ${ethers.formatEther(amount)} ETH từ pool về ví admin.`);

  // Số dư sau khi rút
  const after = await ethers.provider.getBalance(admin.address);
  console.log(`💰 Số dư sau khi rút: ${ethers.formatEther(after)} ETH`);
}

main()
  .then(() => {
    console.log("\n✅ Rút ETH thành công!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Lỗi khi rút ETH:", error);
    process.exit(1);
  });
