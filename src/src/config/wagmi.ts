import { createConfig, createStorage, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const memoryStorage = (() => {
  const map = new Map<string, string>();

  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
})();

export const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC_URL),
  },
  storage: createStorage({ storage: memoryStorage }),
  ssr: false,
});
