import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { OblivionChat, OblivionChat__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("OblivionChat")) as OblivionChat__factory;
  const chat = (await factory.deploy()) as OblivionChat;
  const chatAddress = await chat.getAddress();
  return { chat, chatAddress };
}

describe("OblivionChat", function () {
  let signers: Signers;
  let chat: OblivionChat;
  let chatAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ chat, chatAddress } = await deployFixture());
  });

  it("stores ciphertext and allows key decryption for sender/recipient", async function () {
    const clearA = 1_234_567_890n;
    const ciphertext = "ciphertext-example";

    const encryptedA = await fhevm.createEncryptedInput(chatAddress, signers.alice.address).add64(clearA).encrypt();

    const tx = await chat
      .connect(signers.alice)
      .sendMessage(signers.bob.address, ciphertext, encryptedA.handles[0], encryptedA.inputProof);
    await tx.wait();

    expect(await chat.inboxCount(signers.bob.address)).to.eq(1);

    const [from, timestamp, storedCiphertext, encryptedKey] = await chat.getInboxMessage(signers.bob.address, 0);
    expect(from).to.eq(signers.alice.address);
    expect(storedCiphertext).to.eq(ciphertext);
    expect(timestamp).to.not.eq(0);
    expect(encryptedKey).to.not.eq(ethers.ZeroHash);

    const decryptedByBob = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedKey,
      chatAddress,
      signers.bob,
    );
    expect(decryptedByBob).to.eq(clearA);

    const decryptedByAlice = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedKey,
      chatAddress,
      signers.alice,
    );
    expect(decryptedByAlice).to.eq(clearA);
  });

  it("returns inbox slices", async function () {
    const ciphertexts = ["c1", "c2"];
    const keys = [1_000_000_000n, 9_999_999_999n];

    for (let i = 0; i < ciphertexts.length; i++) {
      const encryptedA = await fhevm
        .createEncryptedInput(chatAddress, signers.alice.address)
        .add64(keys[i])
        .encrypt();
      const tx = await chat
        .connect(signers.alice)
        .sendMessage(signers.bob.address, ciphertexts[i], encryptedA.handles[0], encryptedA.inputProof);
      await tx.wait();
    }

    expect(await chat.inboxCount(signers.bob.address)).to.eq(2);

    const [froms, timestamps, returnedCiphertexts, encryptedKeys] = await chat.getInboxSlice(signers.bob.address, 0, 10);
    expect(froms.length).to.eq(2);
    expect(timestamps.length).to.eq(2);
    expect(returnedCiphertexts.length).to.eq(2);
    expect(encryptedKeys.length).to.eq(2);

    expect(froms[0]).to.eq(signers.alice.address);
    expect(returnedCiphertexts[0]).to.eq("c1");
    expect(returnedCiphertexts[1]).to.eq("c2");

    const clearA0 = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedKeys[0], chatAddress, signers.bob);
    const clearA1 = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedKeys[1], chatAddress, signers.bob);
    expect(clearA0).to.eq(keys[0]);
    expect(clearA1).to.eq(keys[1]);
  });
});

