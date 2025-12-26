import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Examples:
 *   - npx hardhat --network localhost task:chat:address
 *   - npx hardhat --network sepolia task:chat:address
 *   - npx hardhat --network localhost task:chat:send --to 0x... --ciphertext "hello" --a 1234567890
 *   - npx hardhat --network localhost task:chat:decrypt-key --user 0x... --index 0
 */

task("task:chat:address", "Prints the OblivionChat address").setAction(async function (_: TaskArguments, hre) {
  const { deployments } = hre;
  const deployed = await deployments.get("OblivionChat");
  console.log("OblivionChat address is " + deployed.address);
});

task("task:chat:send", "Sends an encrypted message (ciphertext + encrypted key) to a recipient")
  .addOptionalParam("address", "Optionally specify the OblivionChat contract address")
  .addParam("to", "Recipient address")
  .addParam("ciphertext", "Client-encrypted ciphertext string")
  .addOptionalParam("a", "Optional 10-digit key A (decimal), otherwise random")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("OblivionChat");
    console.log(`OblivionChat: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const sender = signers[0];

    const to = taskArguments.to as string;
    const ciphertext = taskArguments.ciphertext as string;

    const providedA = taskArguments.a ? BigInt(taskArguments.a) : undefined;
    const a = providedA ?? (BigInt(Math.floor(Math.random() * 9_000_000_000)) + 1_000_000_000n);

    const encryptedInput = await fhevm.createEncryptedInput(deployment.address, sender.address).add64(a).encrypt();

    const chat = await ethers.getContractAt("OblivionChat", deployment.address);
    const tx = await chat.connect(sender).sendMessage(to, ciphertext, encryptedInput.handles[0], encryptedInput.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`Sent message to ${to} with key A=${a.toString()}`);
  });

task("task:chat:inbox-count", "Prints inboxCount(user)")
  .addOptionalParam("address", "Optionally specify the OblivionChat contract address")
  .addParam("user", "User address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("OblivionChat");
    const chat = await ethers.getContractAt("OblivionChat", deployment.address);
    const count = await chat.inboxCount(taskArguments.user);
    console.log(`inboxCount(${taskArguments.user}) = ${count.toString()}`);
  });

task("task:chat:decrypt-key", "Decrypts the per-message key A for a given inbox message index")
  .addOptionalParam("address", "Optionally specify the OblivionChat contract address")
  .addParam("user", "Inbox owner address")
  .addParam("index", "Message index")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("OblivionChat");
    const chat = await ethers.getContractAt("OblivionChat", deployment.address);

    const signers = await ethers.getSigners();
    const signer = signers[0];

    const index = BigInt(taskArguments.index);
    const message = await chat.getInboxMessage(taskArguments.user, index);
    const encryptedKey = message[3];

    const clearA = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedKey, deployment.address, signer);
    console.log(`decrypted A = ${clearA.toString()}`);
  });

