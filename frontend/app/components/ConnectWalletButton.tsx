'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const injectedConnector = connectors.find((c) => c.id === 'injected');

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="kaelis-connect-btn kaelis-connect-btn--connected"
        aria-label="Disconnect wallet"
      >
        <span className="kaelis-connect-dot" aria-hidden />
        {truncateAddress(address)}
      </button>
    );
  }

  return (
    <button
      onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      disabled={isPending || !injectedConnector}
      className="kaelis-connect-btn"
    >
      {isPending
        ? 'Connecting…'
        : injectedConnector
          ? 'Connect Wallet'
          : 'No wallet detected'}
    </button>
  );
}
