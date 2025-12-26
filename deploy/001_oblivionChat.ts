import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  if (hre.network.name === "sepolia" && !process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in .env for Sepolia deployment");
  }
  if (hre.network.name === "sepolia" && !process.env.INFURA_API_KEY) {
    throw new Error("Missing INFURA_API_KEY in .env for Sepolia deployment");
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("OblivionChat", {
    from: deployer,
    log: true,
  });

  console.log(`OblivionChat contract: `, deployed.address);
};

export default func;
func.id = "deploy_oblivionChat";
func.tags = ["OblivionChat"];
