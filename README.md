# Oblivion Chat

Privacy-first messaging on FHEVM. The app encrypts every message with a random 10-digit key A, sends the ciphertext and
an FHE-encrypted A on-chain, and lets recipients decrypt A to unlock the message.

## Overview

Oblivion Chat is a full-stack demo of privacy-preserving messaging built on Zama's FHEVM. It demonstrates how users can
exchange messages without exposing plaintext on-chain and without relying on server-side trust.

## Problem It Solves

- On-chain messages are public by default, even if you only want the recipient to read them.
- Traditional encryption requires off-chain key sharing, which adds coordination and leakage risk.
- Users want a simple UX: send once, decrypt once, and keep message content private.

## Solution

- Each outgoing message is encrypted with a random 10-digit key A.
- A is also encrypted with Zama FHE and stored on-chain alongside the ciphertext.
- Recipients decrypt A using the FHE flow, then decrypt the message locally.

## Key Advantages

- **On-chain confidentiality**: plaintext never appears on-chain.
- **Minimal trust assumptions**: no server-side key storage or relay of secrets.
- **Deterministic UX**: send, receive, decrypt with a single action.
- **Composable architecture**: contract holds encrypted A + message payload for future integration.

## Tech Stack

- **Smart contracts**: Solidity + Hardhat
- **FHE**: Zama FHEVM (Solidity contracts and relayer flow)
- **Frontend**: React + Vite
- **Wallet + signing**: RainbowKit
- **Reads**: viem
- **Writes**: ethers
- **Package manager**: npm

## How It Works (End-to-End)

1. Sender inputs a message.
2. The app generates a random 10-digit key A.
3. Message is encrypted with A on the client.
4. A is encrypted with Zama FHE and sent on-chain with the ciphertext and recipient address.
5. Recipient opens the message list and clicks "Decrypt".
6. The app requests the FHE decryption of A, then decrypts the message locally.

## Repository Structure

```
contracts/        Smart contracts
deploy/           Deployment scripts
tasks/            Hardhat tasks
test/             Contract tests
src/              Frontend (React + Vite)
docs/             Zama references
```

## Smart Contracts

The contract stores:

- Recipient address
- Encrypted message payload
- FHE-encrypted key A

View functions avoid relying on `msg.sender` for address logic.

## Frontend

The UI is built on React + Vite and wired to FHEVM:

- Wallet connect and transaction signing via RainbowKit and ethers.
- On-chain reads via viem.
- Message encryption and decryption happen locally in the browser.

## Setup

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Environment (Contracts Only)

Create a `.env` in the repo root for contract deployment:

```
PRIVATE_KEY=0x...
INFURA_API_KEY=...
ETHERSCAN_API_KEY=... # optional
```

Do not use mnemonics; deployments rely on a private key.

## Compile and Test

```bash
npm run compile
npm run test
```

## Deploy

### Local Node (for validation)

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

### Sepolia

```bash
npx hardhat deploy --network sepolia
```

## Usage

1. Connect a wallet.
2. Enter a recipient address and your message.
3. Send the encrypted message (ciphertext + encrypted A).
4. As the recipient, open the inbox and click "Decrypt".

## Future Roadmap

- Multi-message threads and pagination.
- Rich message types (attachments and structured data).
- Optional ephemeral key rotation per session.
- Advanced access control (groups and shared keys).
- UX improvements for batch decrypt.

## License

BSD-3-Clause-Clear. See `LICENSE`.
