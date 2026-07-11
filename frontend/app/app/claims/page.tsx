'use client';

import { useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { TopBar } from '../components/TopBar';
import { TxStatusBanner } from '../components/TxStatusBanner';
import { useContractTransaction } from '../../../lib/useContractTransaction';
import { useDecryptHandle } from '../../../lib/useDecryptHandle';
import { CONTRACTS, KaelisCampaignManagerABI } from '../../../lib/contracts';

type FlowState = 'input' | 'checking' | 'eligible' | 'not-eligible' | 'claiming' | 'claimed';

export default function ClaimsPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { execute, status, errorMessage, txHash } = useContractTransaction();
  const { decryptHandle, state: decryptState } = useDecryptHandle();

  const [campaignIdInput, setCampaignIdInput] = useState('');
  const [flow, setFlow] = useState<FlowState>('input');
  const [checkError, setCheckError] = useState<string | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<bigint | null>(null);

  async function handleCheckEligibility() {
    if (!address || !campaignIdInput) return;
    setCheckError(null);
    setFlow('checking');

    try {
      const campaignId = BigInt(campaignIdInput);

      const isRecipient = (await publicClient!.readContract({
        address: CONTRACTS.KaelisCampaignManager,
        abi: KaelisCampaignManagerABI as any,
        functionName: 'isRecipient',
        args: [campaignId, address],
      })) as boolean;

      if (!isRecipient) {
        setFlow('not-eligible');
        return;
      }

      // Confirm the campaign exists and is active before allowing a claim attempt.
      const campaign = (await publicClient!.readContract({
        address: CONTRACTS.KaelisCampaignManager,
        abi: KaelisCampaignManagerABI as any,
        functionName: 'getCampaign',
        args: [campaignId],
      })) as any;

      if (campaign.status !== 0) {
        setCheckError('This campaign is not currently active.');
        setFlow('not-eligible');
        return;
      }

      setFlow('eligible');
    } catch (err) {
      setCheckError(
        err instanceof Error
          ? err.message
          : 'Could not verify eligibility for this campaign id.'
      );
      setFlow('not-eligible');
    }
  }

  async function handleClaim() {
    if (!address) return;
    setFlow('claiming');
    try {
      const campaignId = BigInt(campaignIdInput);
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
      setClaimedAmount(value);
      setFlow('claimed');
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Claim failed.');
      setFlow('eligible');
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
      <div className="kaelis-page kaelis-page--narrow">
        <p className="kaelis-page__subtitle">
          Verify eligibility privately and securely claim your confidential allocation.
        </p>

        <div className="kaelis-card">
          <h2 className="kaelis-form-title">Check eligibility</h2>
          <div className="kaelis-field-row">
            <label className="kaelis-field kaelis-field--grow">
              <span>Campaign ID</span>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={campaignIdInput}
                onChange={(e) => setCampaignIdInput(e.target.value)}
              />
            </label>
            <button
              className="kaelis-btn kaelis-btn--primary"
              onClick={handleCheckEligibility}
              disabled={!campaignIdInput || flow === 'checking'}
            >
              {flow === 'checking' ? 'Checking…' : 'Check eligibility'}
            </button>
          </div>

          {checkError && <p className="kaelis-form-error">{checkError}</p>}

          {flow === 'not-eligible' && !checkError && (
            <div className="kaelis-empty-banner">
              This wallet is not a recipient on campaign #{campaignIdInput}.
            </div>
          )}

          {(flow === 'eligible' || flow === 'claiming' || flow === 'claimed') && (
            <div className="kaelis-eligible-panel">
              <CheckBadge />
              <div>
                <p className="kaelis-eligible-panel__title">
                  You&apos;re eligible on campaign #{campaignIdInput}
                </p>
                <p className="kaelis-form-hint">
                  Your exact allocation stays encrypted until you claim and decrypt it
                  yourself below.
                </p>
              </div>
            </div>
          )}

          {flow === 'eligible' && (
            <button className="kaelis-btn kaelis-btn--primary kaelis-btn--large" onClick={handleClaim}>
              Claim confidential allocation
            </button>
          )}

          {(flow === 'claiming' || flow === 'claimed') && (
            <div className="kaelis-processing">
              <TxStatusBanner
                status={status}
                errorMessage={errorMessage}
                txHash={txHash}
                pendingLabel="Confirming claim on Sepolia…"
                successLabel="Claim confirmed. Decrypting your amount…"
              />
              {status === 'success' && decryptState.status === 'pending' && (
                <p className="kaelis-form-hint">
                  Waiting for the confidential compute result to become available. This
                  can take a few seconds while the off-chain Nox Runner finishes.
                </p>
              )}
              {decryptState.status === 'error' && (
                <p className="kaelis-form-error">{decryptState.message}</p>
              )}
              {flow === 'claimed' && claimedAmount !== null && (
                <div className="kaelis-claimed-result">
                  <CheckBadge large />
                  <h3>Claim successful</h3>
                  <p className="kaelis-claimed-result__amount">{claimedAmount.toString()}</p>
                  <p className="kaelis-form-hint">
                    Decrypted for your wallet only — this figure is not visible to
                    anyone else on-chain.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CheckBadge({ large }: { large?: boolean }) {
  const size = large ? 40 : 22;
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="10" stroke="var(--kaelis-success)" strokeWidth="1.5" />
      <path d="M6.5 11.5 9.5 14.5 15.5 8" stroke="var(--kaelis-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
