export const OBLIVION_CHAT_ADDRESS = '0xD053120B58e55b75dBbB6112c1Aa2Cc348fc77b2' as const;

export const OBLIVION_CHAT_ABI = [
  {
    type: 'event',
    name: 'MessageSent',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: true, name: 'index', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'sendMessage',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'ciphertext', type: 'string' },
      { name: 'encryptedKey', type: 'bytes32' },
      { name: 'inputProof', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'inboxCount',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getInboxMessage',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [
      { name: 'from', type: 'address' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'ciphertext', type: 'string' },
      { name: 'encryptedKey', type: 'bytes32' },
    ],
  },
  {
    type: 'function',
    name: 'getInboxSlice',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'start', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      { name: 'froms', type: 'address[]' },
      { name: 'timestamps', type: 'uint64[]' },
      { name: 'ciphertexts', type: 'string[]' },
      { name: 'keys', type: 'bytes32[]' },
    ],
  },
] as const;

