const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function generateTenDigitKey(): bigint {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return (value % 9_000_000_000n) + 1_000_000_000n;
}

async function deriveAesKey(keyA: bigint): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(keyA.toString()));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptMessage(plaintext: string, keyA: bigint): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(keyA);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));

  return `oc1.${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptMessage(payload: string, keyA: bigint): Promise<string> {
  const [version, ivB64, ctB64] = payload.split('.');
  if (version !== 'oc1' || !ivB64 || !ctB64) {
    throw new Error('InvalidCiphertextFormat');
  }

  const iv = fromBase64(ivB64);
  const ciphertext = fromBase64(ctB64);
  const key = await deriveAesKey(keyA);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return decoder.decode(plaintext);
}

