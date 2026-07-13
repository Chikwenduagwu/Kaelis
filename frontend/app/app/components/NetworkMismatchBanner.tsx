'use client';

import { useAccount, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';

/**
 * Shown whenever a connected wallet is on the wrong chain. Offers a one-click switch
 * via wagmi's useSwitchChain (calls wallet_switchEthereumChain under the hood, and
 * wallet_addEthereumChain automatically if the wallet doesn't have Sepolia added yet
 * for injected connectors that support it). Falls back to manual instructions if the
 * connected wallet doesn't support programmatic chain switching.
 */
export function NetworkMismatchBanner() {
  const { chain, isConnected } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();

  if (!isConnected || chain?.id === sepolia.id) return null;

  return (
    <div className="kaelis-network-banner" role="alert">
      <div className="kaelis-network-banner__text">
        <strong>Wrong network.</strong> Kaelis runs on Ethereum Sepolia
        {chain?.name ? ` -- your wallet is connected to ${chain.name}.` : '.'}
      </div>
      <button
        className="kaelis-network-banner__button"
        onClick={() => switchChain({ chainId: sepolia.id })}
        disabled={isPending}
      >
        {isPending ? 'Switching…' : 'Switch to Sepolia'}
      </button>
      {error && (
        <span className="kaelis-network-banner__error">
          Couldn&apos;t switch automatically -- please switch to Sepolia manually in your wallet.
        </span>
      )}
    </div>
  );
      }
