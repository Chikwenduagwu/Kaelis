'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { TopBar } from '../components/TopBar';
import { PageHero } from '../components/PageHero';

type ClaimState = 'idle' | 'claiming' | 'success' | 'error';

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<ClaimState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClaim() {
    if (!address) return;
    setState('claiming');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Faucet claim failed.');
      }

      setTxHash(data.txHash);
      setState('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Faucet claim failed.');
      setState('error');
    }
  }

  if (!isConnected) {
    return (
      <>
        <TopBar title="Faucet" />
        <div className="kaelis-page">
          <div className="kaelis-empty-banner">Connect your wallet to claim test tokens.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Faucet" />
      <div className="kaelis-page kaelis-page--narrow">
        <PageHero
          title="Faucet"
          subtitle="Claim confidential KaelisToken on Sepolia to try creating a distribution."
        />

        <div className="kaelis-card kaelis-faucet-card">
          <div className="kaelis-faucet-card__icon">
            <FaucetIcon />
          </div>

          <p className="kaelis-faucet-card__eyebrow">Test Tokens</p>
          <h2 className="kaelis-form-title">1,000 kUSD</h2>
          <p className="kaelis-form-hint">
            Minted directly to your connected wallet. You can use these to fund a
            confidential distribution on the Distributions page.
          </p>

          <div className="kaelis-faucet-features">
            <div className="kaelis-faucet-feature">
              <LockIcon />
              <span className="kaelis-faucet-feature__label">Private</span>
              <span className="kaelis-faucet-feature__sub">by default</span>
            </div>
            <div className="kaelis-faucet-feature">
              <ShieldSmallIcon />
              <span className="kaelis-faucet-feature__label">Encrypted</span>
              <span className="kaelis-faucet-feature__sub">balances</span>
            </div>
            <div className="kaelis-faucet-feature">
              <BeakerIcon />
              <span className="kaelis-faucet-feature__label">Test Tokens</span>
              <span className="kaelis-faucet-feature__sub">for Sepolia</span>
            </div>
          </div>

          {state === 'idle' && (
            <button className="kaelis-btn kaelis-btn--primary kaelis-btn--large" onClick={handleClaim}>
              Claim 1,000 kUSD
            </button>
          )}

          {state === 'claiming' && (
            <div className="kaelis-processing">
              <Spinner />
              <p>Minting to your wallet…</p>
            </div>
          )}

          {state === 'success' && (
            <div className="kaelis-claimed-result">
              <CheckBadge />
              <h3>Claim successful</h3>
              <p className="kaelis-form-hint">1,000 kUSD has been minted to your wallet.</p>
              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="kaelis-tx-banner__link"
                >
                  View transaction on Etherscan
                </a>
              )}
              <button
                className="kaelis-btn kaelis-btn--secondary"
                onClick={() => {
                  setState('idle');
                  setTxHash(null);
                }}
              >
                Claim again
              </button>
            </div>
          )}

          {state === 'error' && (
            <div className="kaelis-processing">
              <p className="kaelis-form-error">{errorMessage}</p>
              <button className="kaelis-btn kaelis-btn--primary" onClick={handleClaim}>
                Try again
              </button>
            </div>
          )}

          <div className="kaelis-faucet-info">
            <InfoIcon />
            <span>
              KaelisToken is confidential (ERC-7984) and built on iExec Nox Protocol.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function FaucetIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M20 5 L32 11 V19 C32 27 27 33 20 35 C13 33 8 27 8 19 V11 Z"
        stroke="var(--kaelis-gold)"
        strokeWidth="1.6"
      />
      <path d="M20 14v10M15 19h10" stroke="var(--kaelis-gold)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ShieldSmallIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 L20 6.5 V11.5 C20 16.5 16.6 20.3 12 21.5 C7.4 20.3 4 16.5 4 11.5 V6.5 Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function BeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6M10 3v6l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5.5M12 7.5v.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <div className="kaelis-orbital-loader" role="status" aria-label="Processing">
      <div className="kaelis-orbital-loader__glow" />
      <div className="kaelis-orbital-loader__ring kaelis-orbital-loader__ring--outer" />
      <div className="kaelis-orbital-loader__ring kaelis-orbital-loader__ring--inner" />
      <div className="kaelis-orbital-loader__core" />
    </div>
  );
}

function CheckBadge() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="18" stroke="var(--kaelis-success)" strokeWidth="2" />
      <path d="M12 20.5 17.5 26 29 14" stroke="var(--kaelis-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
        }
