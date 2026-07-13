import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

/**
 * Per the Kaelis brief: injected wallet only, no WalletConnect. This keeps the wallet
 * surface deliberately narrow (MetaMask / Rabby / Coinbase Wallet extension / any
 * EIP-1193 injected provider) rather than adding a WalletConnect modal + relay
 * dependency the brief explicitly excluded.
 *
 * RPC transport: viem's http() with no argument falls back to a default public RPC
 * per chain (thirdweb's public Sepolia endpoint for chain 11155111), which proved too
 * unreliable for the eth_getLogs volume the dashboard needs (rate limits, dropped
 * connections surfacing as "Failed to fetch"). Pointing this at a dedicated provider
 * (Alchemy/Infura -- the same one used for contract deployment) instead is far more
 * stable. Set NEXT_PUBLIC_SEPOLIA_RPC_URL in .env.local / Vercel env vars; falls back
 * to the public default only if that's not configured, so the app doesn't hard-crash
 * in an environment where it hasn't been set yet.
 */
const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(rpcUrl),
  },
  ssr: true,
});
