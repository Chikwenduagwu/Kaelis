'use client';

import { useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { TopBar } from '../components/TopBar';
import { PageHero } from '../components/PageHero';
import { TxStatusBanner } from '../components/TxStatusBanner';
import { useContractTransaction } from '../../../lib/useContractTransaction';
import { useDecryptHandle } from '../../../lib/useDecryptHandle';
import { useEligibleCampaigns } from './useEligibleCampaigns';
import { CONTRACTS, KaelisCampaignManagerABI } from '../../../lib/contracts';

export default function ClaimsPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { decryptHandle, state: decryptState, isReady: isDecryptReady } = useDecryptHandle();
  const { campaigns, isLoading, error, isDeployed } = useEligibleCampaigns(address, decryptHandle, isDecryptReady);
  const { execute, status, errorMessage, txHash } = useContractTransaction();

  const [claimingId, setClaimingId] = useState<bigint | null>(null);
  const [claimedResults, setClaimedResults] = useState<Record<string, bigint>>({});
  const [claimError, setClaimError] = useState<string | null>(null);

  async function handleClaim(campaignId: bigint) {
    if (!address) return;
    setClaimingId(campaignId);
    setClaimError(null);

    try {
      await execute({
        address: CONTRACTS.KaelisCampaignManager,
        abi: KaelisCampaignManagerABI as any,
        functionName: 'claim',
        args: [campaignId],
      });

      // The claimed amount is only decryptable once the off-chain Nox Runner has
      // finished the confidential compute triggered by claim() -- decryptHandle's
      // underlying SDK call retries with backoff for exactly this reason.
      const claimedHandle = (await publicClient!.readContract({
        address: CONTRACTS.KaelisCampaignManager,
        abi: KaelisCampaignManagerABI as any,
        functionName: 'getClaimedHandle',
        args: [campaignId, address],
      })) as `0x${string}`;

      const value = await decryptHandle(claimedHandle);
      setClaimedResults((prev) => ({ ...prev, [campaignId.toString()]: value }));
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Claim failed.');
    } finally {
      setClaimingId(null);
    }
  }

  if (!isConnected) {
    return (
      <>
        <TopBar title="Claims" />
        <div className="kaelis-page">
          <div className="kaelis-empty-banner">Connect your wallet to check eligibility and claim.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Claims" />
      <div className="kaelis-page">
        <PageHero
          title="Claims"
          subtitle="Verify eligibility privately and securely claim your confidential allocation."
        />

        {isDeployed && error && (
          <div className="kaelis-empty-banner kaelis-empty-banner--error">{error}</div>
        )}

        {!isDeployed && (
          <div className="kaelis-empty-banner">
            Contracts not yet deployed to this network. Run{' '}
            <code>npm run deploy:sepolia</code>.
          </div>
        )}

        {isLoading && (
          <>
            <div className="kaelis-empty-banner">
              Checking eligibility and decrypting claim status — you may see a few
              wallet signature prompts.
            </div>
            <div className="kaelis-eligible-list">
              <div className="kaelis-skeleton-list" style={{ padding: '16px 0' }}>
                {[0, 1].map((i) => (
                  <div className="kaelis-skeleton-row" key={i} />
                ))}
              </div>
            </div>
          </>
        )}

        {!isLoading && isDeployed && !error && campaigns.length === 0 && (
          <div className="kaelis-no-eligibility">
            <NoEligibilityIcon />
            <p>You&apos;re not eligible for any airdrops at the moment.</p>
            <span className="kaelis-form-hint">
              When a distributor adds your wallet to a campaign, it will show up here.
            </span>
          </div>
        )}

        {!isLoading && campaigns.length > 0 && (
          <div className="kaelis-eligible-list">
            {campaigns.map((c) => {
              const key = c.id.toString();
              const isThisClaiming = claimingId === c.id;
              const justClaimedValue = claimedResults[key];
              const isPaused = c.status === 1;
              const isCompleted = c.status === 2;
              const isAlreadyFullyClaimed = c.isFullyClaimed && justClaimedValue === undefined;

              return (
                <div key={key} className="kaelis-eligible-row">
                  <div className="kaelis-eligible-row__icon">
                    <CampaignIcon />
                  </div>
                  <div className="kaelis-eligible-row__main">
                    <span className="kaelis-eligible-row__title">
                      Eligible for {c.campaignType} Campaign #{key}
                    </span>
                    <span className="kaelis-eligible-row__meta">
                      {c.tokenSymbol}
                      {isPaused && ' · Paused'}
                      {isCompleted && ' · Completed'}
                    </span>

                    {isThisClaiming && (
                      <div className="kaelis-eligible-row__status">
                        <TxStatusBanner
                          status={status}
                          errorMessage={errorMessage}
                          txHash={txHash}
                          pendingLabel="Confirming claim on Sepolia…"
                          successLabel="Claim confirmed. Decrypting your amount…"
                        />
                        {status === 'success' && decryptState.status === 'pending' && (
                          <p className="kaelis-form-hint">Decrypting your claimed amount…</p>
                        )}
                      </div>
                    )}

                    {claimError && claimingId === null && (
                      <p className="kaelis-form-error">{claimError}</p>
                    )}

                    {justClaimedValue !== undefined && (
                      <div className="kaelis-eligible-row__result">
                        <CheckBadge />
                        {justClaimedValue > 0n
                          ? `Claimed ${justClaimedValue.toString()} ${c.tokenSymbol}`
                          : 'Already fully claimed — nothing new to claim'}
                      </div>
                    )}

                    {isAlreadyFullyClaimed && (
                      <div className="kaelis-eligible-row__result kaelis-eligible-row__result--muted">
                        <CheckBadge />
                        Already claimed {c.claimed.toString()} of {c.allocation.toString()}{' '}
                        {c.tokenSymbol}
                      </div>
                    )}
                  </div>

                  {justClaimedValue === undefined && !isAlreadyFullyClaimed && (
                    <button
                      className="kaelis-btn kaelis-btn--primary kaelis-eligible-row__claim-btn"
                      onClick={() => handleClaim(c.id)}
                      disabled={isThisClaiming || isPaused || isCompleted}
                    >
                      {isThisClaiming ? 'Claiming…' : 'Claim'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function CampaignIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2 L17 5.5 V9 C17 13.5 14 17.5 10 18.5 C6 17.5 3 13.5 3 9 V5.5 Z"
        stroke="var(--kaelis-gold)"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function NoEligibilityIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="17" stroke="var(--kaelis-line)" strokeWidth="1.6" />
      <path d="M13 20h14" stroke="var(--kaelis-ink-faint)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckBadge() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="var(--kaelis-success)" strokeWidth="1.5" />
      <path d="M6 10.5 8.5 13 14 7" stroke="var(--kaelis-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
                }
