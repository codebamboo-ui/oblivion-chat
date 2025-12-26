import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { Contract } from 'ethers';
import { isAddress } from 'viem';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { OBLIVION_CHAT_ABI, OBLIVION_CHAT_ADDRESS } from '../config/contracts';
import { encryptMessage, generateTenDigitKey } from '../lib/oblivionCrypto';
import '../styles/SendMessage.css';

export function SendMessage() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [txHash, setTxHash] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  const isConfigured = useMemo(
    () => OBLIVION_CHAT_ADDRESS.toLowerCase() !== '0x0000000000000000000000000000000000000000',
    [],
  );

  const canSend =
    !!address &&
    !!signerPromise &&
    !!instance &&
    !zamaLoading &&
    !isSending &&
    isConfigured &&
    isAddress(recipient) &&
    message.trim().length > 0;

  const onSend = async () => {
    if (!canSend || !address || !instance || !signerPromise) return;

    setIsSending(true);
    setStatus('');
    setTxHash('');

    try {
      setStatus('Generating key and encrypting message...');
      const keyA = generateTenDigitKey();
      const ciphertext = await encryptMessage(message.trim(), keyA);

      setStatus('Encrypting key with FHEVM...');
      const input = instance.createEncryptedInput(OBLIVION_CHAT_ADDRESS, address);
      input.add64(keyA);
      const encryptedInput = await input.encrypt();

      setStatus('Requesting wallet signature...');
      const signer = await signerPromise;
      const contract = new Contract(OBLIVION_CHAT_ADDRESS, OBLIVION_CHAT_ABI, signer);

      setStatus('Sending transaction...');
      const tx = await contract.sendMessage(recipient, ciphertext, encryptedInput.handles[0], encryptedInput.inputProof);
      setTxHash(tx.hash);

      setStatus('Waiting for confirmation...');
      await tx.wait();

      setStatus('Message sent.');
      setMessage('');
    } catch (e) {
      console.error(e);
      setStatus(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  if (!address) {
    return (
      <div className="panel">
        <h2 className="panel-title">Send a message</h2>
        <p className="panel-subtitle">Connect your wallet to start.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Send a message</h2>
      <p className="panel-subtitle">
        Your message is encrypted with a random 10-digit key, and the key is encrypted with FHEVM.
      </p>

      {!isConfigured && (
        <div className="notice warning">
          <strong>Contract address not configured.</strong> Update `src/src/config/contracts.ts`.
        </div>
      )}

      {zamaError && <div className="notice error">{zamaError}</div>}

      <div className="field">
        <label className="label" htmlFor="recipient">
          Recipient address
        </label>
        <input
          id="recipient"
          className="input"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value.trim())}
          placeholder="0x..."
          spellCheck={false}
        />
        {recipient.length > 0 && !isAddress(recipient) && <div className="hint error">Invalid address.</div>}
      </div>

      <div className="field">
        <label className="label" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          className="textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write something..."
          rows={5}
        />
      </div>

      <div className="actions">
        <button className="button primary" type="button" onClick={onSend} disabled={!canSend}>
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>

      {(zamaLoading || status || txHash) && (
        <div className="status">
          {zamaLoading && <div>Initializing encryption service...</div>}
          {status && <div>{status}</div>}
          {txHash && (
            <div className="mono">
              Tx: <span>{txHash}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

