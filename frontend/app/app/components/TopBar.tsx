'use client';

import { useAccount } from 'wagmi';
import { ConnectWalletButton } from '../../components/ConnectWalletButton';

export function TopBar({ title }: { title: string }) {
  const { chain, isConnected } = useAccount();
  const onSepolia = chain?.id === 11155111;

  return (
    <header className="kaelis-topbar">
      <h1 className="kaelis-topbar__title">{title}</h1>
      <div className="kaelis-topbar__right">
        {isConnected && (
          <span
            className={`kaelis-network-pill${onSepolia ? '' : ' kaelis-network-pill--warn'}`}
          >
            <span className="kaelis-network-dot" aria-hidden />
            {onSepolia ? 'Sepolia' : chain?.name ?? 'Wrong network'}
          </span>
        )}
        <ConnectWalletButton />
      </div>
    </header>
  );
}
