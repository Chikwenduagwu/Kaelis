import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

/**
 * Per the Kaelis brief: injected wallet only, no WalletConnect. This keeps the wallet
 * surface deliberately narrow (MetaMask / Rabby / Coinbase Wallet extension / any
 * EIP-1193 injected provider) rather than adding a WalletConnect modal + relay
 * dependency the brief explicitly excluded.
 */
export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
  },
  ssr: true,
});
