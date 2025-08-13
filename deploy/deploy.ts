import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("=== Deploying LuckySpinFHE_Complete to Sepolia Testnet ===");
  console.log("Deploying contracts with account:", deployer);

  const deployedLuckySpinFHE = await deploy("LuckySpinFHE_Complete", {
    from: deployer,
    log: true,
    args: [], // No constructor arguments needed
  });

  console.log(`LuckySpinFHE_Complete contract deployed at: ${deployedLuckySpinFHE.address}`);
  
  // Verify deployment
  console.log("=== Deployment Summary ===");
  console.log("Contract Name: LuckySpinFHE_Complete");
  console.log("Contract Address:", deployedLuckySpinFHE.address);
  console.log("Network: Sepolia Testnet");
  console.log("Deployer:", deployer);
  
  // Save contract address to .env format for easy copy
  console.log("\n=== Add to your .env file ===");
  console.log(`CONTRACT_ADDRESS=${deployedLuckySpinFHE.address}`);
};

export default func;
func.id = "deploy_luckySpinFHE_Complete"; // id required to prevent reexecution
func.tags = ["LuckySpinFHE_Complete"];
