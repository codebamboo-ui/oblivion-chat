import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { publicClient } from '../config/viem';
import { OBLIVION_CHAT_ABI, OBLIVION_CHAT_ADDRESS } from '../config/contracts';
import { decryptMessage } from '../lib/oblivionCrypto';
import '../styles/SendMessage.css';
import '../styles/Inbox.css';

type InboxMessage = {
  index: bigint;
  from: `0x${string}`;
  timestamp: bigint;
  ciphertext: string;
  encryptedKey: `0x${string}`;
};

export function Inbox() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string>('');
  const [decryptingIndex, setDecryptingIndex] = useState<bigint | null>(null);
  const [decrypted, setDecrypted] = useState<Record<string, { keyA: string; plaintext: string }>>({});

  const isConfigured = useMemo(
    () => OBLIVION_CHAT_ADDRESS.toLowerCase() !== '0x0000000000000000000000000000000000000000',
    [],
  );

  const refresh = useCallback(async () => {
    if (!address || !isConfigured) return;

    setIsRefreshing(true);
    setRefreshError('');
    try {
      const count = (await publicClient.readContract({
        address: OBLIVION_CHAT_ADDRESS,
        abi: OBLIVION_CHAT_ABI,
        functionName: 'inboxCount',
        args: [address],
      })) as bigint;

      const pageSize = 25n;
      const start = count > pageSize ? count - pageSize : 0n;

      const slice = (await publicClient.readContract({
        address: OBLIVION_CHAT_ADDRESS,
        abi: OBLIVION_CHAT_ABI,
        functionName: 'getInboxSlice',
        args: [address, start, pageSize],
      })) as readonly [
        readonly `0x${string}`[],
        readonly bigint[],
        readonly string[],
        readonly `0x${string}`[],
      ];

      const [froms, timestamps, ciphertexts, keys] = slice;
      const loaded: InboxMessage[] = [];
      for (let i = 0; i < froms.length; i++) {
        loaded.push({
          index: start + BigInt(i),
          from: froms[i],
          timestamp: timestamps[i],
          ciphertext: ciphertexts[i],
          encryptedKey: keys[i],
        });
      }
      loaded.reverse();
      setMessages(loaded);
    } catch (e) {
      console.error(e);
      setRefreshError(e instanceof Error ? e.message : 'Failed to load inbox');
    } finally {
      setIsRefreshing(false);
    }
  }, [address, isConfigured]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const decryptOne = async (message: InboxMessage) => {
    if (!address || !instance || !signerPromise) return;
    setDecryptingIndex(message.index);
    try {
      const keypair = instance.generateKeypair();
      const handleContractPairs = [{ handle: message.encryptedKey, contractAddress: OBLIVION_CHAT_ADDRESS }];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [OBLIVION_CHAT_ADDRESS];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signer = await signerPromise;
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const keyAString = result[message.encryptedKey as string];
      if (!keyAString) throw new Error('DecryptionFailed');
      const keyA = BigInt(keyAString);

      const plaintext = await decryptMessage(message.ciphertext, keyA);
      setDecrypted((prev) => ({
        ...prev,
        [message.index.toString()]: { keyA: keyA.toString(), plaintext },
      }));
    } catch (e) {
      console.error(e);
      setDecrypted((prev) => ({
        ...prev,
        [message.index.toString()]: { keyA: '', plaintext: e instanceof Error ? e.message : 'Failed to decrypt' },
      }));
    } finally {
      setDecryptingIndex(null);
    }
  };

  if (!address) {
    return (
      <div className="panel">
        <h2 className="panel-title">Inbox</h2>
        <p className="panel-subtitle">Connect your wallet to view messages.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="inbox-header">
        <div>
          <h2 className="panel-title">Inbox</h2>
          <p className="panel-subtitle">Decrypt a message to request the key A from the relayer and unlock the text.</p>
        </div>
        <button className="button" type="button" onClick={() => void refresh()} disabled={!isConfigured || isRefreshing}>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {!isConfigured && (
        <div className="notice warning">
          <strong>Contract address not configured.</strong> Update `src/src/config/contracts.ts`.
        </div>
      )}
      {zamaError && <div className="notice error">{zamaError}</div>}
      {zamaLoading && <div className="hint">Initializing encryption service...</div>}
      {refreshError && <div className="notice error">{refreshError}</div>}

      {messages.length === 0 ? (
        <div className="empty">No messages found.</div>
      ) : (
        <div className="message-list">
          {messages.map((m) => {
            const d = decrypted[m.index.toString()];
            const date = new Date(Number(m.timestamp) * 1000);
            return (
              <div className="message-card" key={m.index.toString()}>
                <div className="message-meta">
                  <div className="mono">
                    <span className="muted">From</span> {m.from}
                  </div>
                  <div className="muted">{date.toLocaleString()}</div>
                </div>

                <div className="message-body">
                  {d ? (
                    <>
                      <div className="plaintext">{d.plaintext}</div>
                      {d.keyA && (
                        <div className="mono muted">
                          Key A: <span>{d.keyA}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="ciphertext">
                      <span className="muted">Ciphertext</span> {m.ciphertext.slice(0, 80)}
                      {m.ciphertext.length > 80 ? '…' : ''}
                    </div>
                  )}
                </div>

                <div className="message-actions">
                  <button
                    className="button primary"
                    type="button"
                    onClick={() => void decryptOne(m)}
                    disabled={!instance || !signerPromise || decryptingIndex === m.index}
                  >
                    {decryptingIndex === m.index ? 'Decrypting...' : 'Decrypt'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
