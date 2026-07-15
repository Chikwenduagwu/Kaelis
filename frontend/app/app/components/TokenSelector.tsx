'use client';

import { useState } from 'react';
import type { PublicClient } from 'viem';
import { SUPPORTED_TOKENS, KaelisTokenABI } from '../../../lib/contracts';

// Placeholder entries for assets that don't have a deployed confidential token/wrapper
// on Ethereum Sepolia yet -- shown so the picker communicates the roadmap honestly
// (per product direction: only KaelisToken is selectable, others show "Coming soon")
// rather than silently omitting them.
const COMING_SOON_ASSETS = [
  { symbol: 'USDT', name: 'Tether USD (confidential wrapper)' },
  { symbol: 'USDC', name: 'USD Coin (confidential wrapper)' },
  { symbol: 'BTC', name: 'Wrapped Bitcoin (confidential wrapper)' },
];

interface TokenSelectorProps {
  selectedAddress: `0x${string}`;
  onSelect: (address: `0x${string}`) => void;
  publicClient: PublicClient | undefined;
  walletAddress: `0x${string}` | undefined;
  decryptHandle: (handle: `0x${string}`) => Promise<bigint>;
}

type BalanceState =
  | { status: 'hidden' }
  | { status: 'loading' }
  | { status: 'revealed'; value: bigint }
  | { status: 'error' };

export function TokenSelector({
  selectedAddress,
  onSelect,
  publicClient,
  walletAddress,
  decryptHandle,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [balances, setBalances] = useState<Record<string, BalanceState>>({});

  const selectedToken = SUPPORTED_TOKENS.find((t) => t.address === selectedAddress) ?? SUPPORTED_TOKENS[0];

  async function revealBalance(tokenAddress: `0x${string}`) {
    if (!publicClient || !walletAddress) return;
    setBalances((prev) => ({ ...prev, [tokenAddress]: { status: 'loading' } }));
    try {
      const handle = (await publicClient.readContract({
        address: tokenAddress,
        abi: KaelisTokenABI as any,
        functionName: 'confidentialBalanceOf',
        args: [walletAddress],
      })) as `0x${string}`;
      const value = await decryptHandle(handle);
      setBalances((prev) => ({ ...prev, [tokenAddress]: { status: 'revealed', value } }));
    } catch {
      setBalances((prev) => ({ ...prev, [tokenAddress]: { status: 'error' } }));
    }
  }

  return (
    <div className="kaelis-token-selector">
      <button
        type="button"
        className="kaelis-token-selector__trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="kaelis-token-selector__badge">{selectedToken.symbol.slice(0, 1)}</span>
        <span className="kaelis-token-selector__label">
          <span className="kaelis-token-selector__symbol">{selectedToken.symbol}</span>
          <span className="kaelis-token-selector__name">{selectedToken.name}</span>
        </span>
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div className="kaelis-token-selector__panel">
          {SUPPORTED_TOKENS.map((token) => {
            const balanceState = balances[token.address] ?? { status: 'hidden' };
            const isSelected = token.address === selectedAddress;
            return (
              <div
                key={token.address}
                className={`kaelis-token-option${isSelected ? ' kaelis-token-option--selected' : ''}`}
              >
                <button
                  type="button"
                  className="kaelis-token-option__main"
                  onClick={() => {
                    onSelect(token.address);
                    setIsOpen(false);
                  }}
                >
                  <span className="kaelis-token-selector__badge">{token.symbol.slice(0, 1)}</span>
                  <span className="kaelis-token-selector__label">
                    <span className="kaelis-token-selector__symbol">{token.symbol}</span>
                    <span className="kaelis-token-selector__name">{token.name}</span>
                  </span>
                  {isSelected && <CheckIcon />}
                </button>

                <button
                  type="button"
                  className="kaelis-token-option__balance"
                  onClick={(e) => {
                    e.stopPropagation();
                    revealBalance(token.address);
                  }}
                  disabled={balanceState.status === 'loading'}
                >
                  {balanceState.status === 'hidden' && (
                    <>
                      <LockIcon /> Reveal balance
                    </>
                  )}
                  {balanceState.status === 'loading' && 'Decrypting…'}
                  {balanceState.status === 'revealed' && `Balance: ${balanceState.value.toString()}`}
                  {balanceState.status === 'error' && 'Could not decrypt'}
                </button>
              </div>
            );
          })}

          {COMING_SOON_ASSETS.map((asset) => (
            <div key={asset.symbol} className="kaelis-token-option kaelis-token-option--disabled">
              <div className="kaelis-token-option__main" aria-disabled="true">
                <span className="kaelis-token-selector__badge kaelis-token-selector__badge--muted">
                  {asset.symbol.slice(0, 1)}
                </span>
                <span className="kaelis-token-selector__label">
                  <span className="kaelis-token-selector__symbol">{asset.symbol}</span>
                  <span className="kaelis-token-selector__name">{asset.name}</span>
                </span>
                <span className="kaelis-coming-soon-badge">Coming soon</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 8l5 5 5-5" stroke="var(--kaelis-ink-soft)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10.5 8 14.5 16 6" stroke="var(--kaelis-gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
  }
          
