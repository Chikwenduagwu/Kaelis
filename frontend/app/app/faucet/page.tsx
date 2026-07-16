'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { TopBar } from '../components/TopBar';

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
        <p className="kaelis-page__subtitle">
          Claim confidential KaelisToken on Sepolia to try creating a distribution.
        </p>

        <div className="kaelis-card kaelis-faucet-card">
          <div className="kaelis-faucet-card__icon">
            <FaucetIcon />
          </div>
          <h2 className="kaelis-form-title">1,000 kUSD</h2>
          <p className="kaelis-form-hint">
            Minted directly to your connected wallet. You can use these to fund a
            confidential distribution on the Distributions page.
          </p>

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
    
