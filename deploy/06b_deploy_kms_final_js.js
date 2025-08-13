const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("LuckySpinFHE_KMS_Final");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("LuckySpinFHE_KMS_Final:", address);

  const balance = await hre.ethers.provider.getBalance(address);
  console.log("Contract balance:", hre.ethers.formatEther(balance), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
