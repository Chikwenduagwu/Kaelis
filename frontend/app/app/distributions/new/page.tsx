'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { parseEventLogs } from 'viem';
import { TopBar } from '../../components/TopBar';
import { TxStatusBanner } from '../../components/TxStatusBanner';
import { useContractTransaction } from '../../../../lib/useContractTransaction';
import { useNoxHandleClient } from '../../../../lib/useNoxHandleClient';
import { CONTRACTS, KaelisCampaignManagerABI, KaelisTokenABI, CAMPAIGN_TYPE } from '../../../../lib/contracts';

interface RecipientRow {
  address: string;
  allocation: string; // plaintext input, encrypted client-side before submission
}

type CampaignTypeKey = keyof typeof CAMPAIGN_TYPE;

type Step = 'details' | 'recipients' | 'review' | 'submitting' | 'done';

export default function NewDistributionPage() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { getHandleClient } = useNoxHandleClient();
  const { execute, status, errorMessage, txHash } = useContractTransaction();

  const [step, setStep] = useState<Step>('details');
  const [campaignType, setCampaignType] = useState<CampaignTypeKey>('Airdrop');
  const [tokenAddress, setTokenAddress] = useState(
    CONTRACTS.KaelisToken !== '0x0000000000000000000000000000000000000000'
      ? CONTRACTS.KaelisToken
      : ''
  );
  const [startDate, setStartDate] = useState('');
  const [cliffDays, setCliffDays] = useState('0');
  const [vestingDays, setVestingDays] = useState('0');
  const [recipients, setRecipients] = useState<RecipientRow[]>([{ address: '', allocation: '' }]);
  const [progressLabel, setProgressLabel] = useState('');
  const [createdCampaignId, setCreatedCampaignId] = useState<bigint | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const needsSchedule = campaignType !== 'Airdrop';

  function updateRecipient(index: number, field: keyof RecipientRow, value: string) {
    setRecipients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addRecipientRow() {
    setRecipients((prev) => [...prev, { address: '', allocation: '' }]);
  }

  function removeRecipientRow(index: number) {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  }

  function validateDetails(): string | null {
    if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return 'Enter a valid token contract address.';
    }
    if (needsSchedule) {
      if (!startDate) return 'Set a start date for the vesting schedule.';
      const vd = Number(vestingDays);
      const cd = Number(cliffDays);
      if (!vd || vd <= 0) return 'Vesting duration must be greater than zero.';
      if (cd > vd) return 'Cliff cannot be longer than the vesting duration.';
    }
    return null;
  }

  function validateRecipients(): string | null {
    if (recipients.length === 0) return 'Add at least one recipient.';
    for (const r of recipients) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(r.address)) return `Invalid address: ${r.address || '(empty)'}`;
      if (!r.allocation || Number(r.allocation) <= 0) return 'Every recipient needs an allocation greater than zero.';
    }
    return null;
  }

  async function handleSubmitCampaign() {
    setFormError(null);
    setStep('submitting');

    try {
      const handleClient = await getHandleClient();
      const startTime = needsSchedule
        ? Math.floor(new Date(startDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);
      const cliffSeconds = needsSchedule ? Number(cliffDays) * 86400 : 0;
      const vestingSeconds = needsSchedule ? Number(vestingDays) * 86400 : 0;

      // ---- 0. Fund the pool: mint the total of all recipient allocations into the
      // campaign manager's own balance BEFORE creating the campaign. Without this,
      // claim() has nothing real to pay out -- the manager's confidentialTransfer
      // call fails because its balance was never actually funded. mint() is
      // onlyOwner on KaelisToken, so this step only succeeds if the connected
      // wallet is the token's deployer/owner; a clear error surfaces otherwise
      // rather than silently creating an unfunded campaign.
      const totalAllocation = recipients.reduce((sum, r) => sum + BigInt(r.allocation || '0'), 0n);
      setProgressLabel('Encrypting pool funding amount...');
      const mintEncrypted = await handleClient.encryptInput(totalAllocation, 'uint256', tokenAddress as `0x${string}`);

      setProgressLabel('Funding campaign pool...');
      await execute({
        address: tokenAddress as `0x${string}`,
        abi: KaelisTokenABI as any,
        functionName: 'mint',
        args: [CONTRACTS.KaelisCampaignManager, mintEncrypted.handle, mintEncrypted.handleProof],
      });

      // ---- 1. createCampaign ----
      setProgressLabel('Creating campaign...');
      const { receipt } = await execute({
        address: CONTRACTS.KaelisCampaignManager,
        abi: KaelisCampaignManagerABI as any,
        functionName: 'createCampaign',
        args: [
          CAMPAIGN_TYPE[campaignType],
          tokenAddress as `0x${string}`,
          BigInt(startTime),
          BigInt(cliffSeconds),
          BigInt(vestingSeconds),
        ],
      });

      // Resolve the real campaign id from the CampaignCreated event emitted by this
      // exact transaction, rather than reading campaignCount() afterwards -- reading
      // the counter separately would be racy if another distributor created a
      // campaign in between the two calls.
      const decodedLogs = parseEventLogs({
        abi: KaelisCampaignManagerABI as any,
        eventName: 'CampaignCreated',
        logs: receipt?.logs ?? [],
      });
      const campaignId = (decodedLogs[0] as unknown as { args: { campaignId: bigint } } | undefined)
        ?.args.campaignId;
      if (campaignId === undefined) {
        throw new Error('Could not determine the new campaign id from the transaction receipt.');
      }
      setCreatedCampaignId(campaignId);

      // ---- 2. addRecipient for each row (each allocation encrypted client-side) ----
      let index = 0;
      for (const recipient of recipients) {
        index += 1;
        setProgressLabel(`Encrypting allocation ${index}/${recipients.length}...`);
        const encrypted = await handleClient.encryptInput(
          BigInt(recipient.allocation),
          'uint256',
          CONTRACTS.KaelisCampaignManager
        );

        setProgressLabel(`Adding recipient ${index}/${recipients.length}...`);
        await execute({
          address: CONTRACTS.KaelisCampaignManager,
          abi: KaelisCampaignManagerABI as any,
          functionName: 'addRecipient',
          args: [campaignId, recipient.address as `0x${string}`, encrypted.handle, encrypted.handleProof],
        });
      }

      setProgressLabel('Sealing campaign...');
      await execute({
        address: CONTRACTS.KaelisCampaignManager,
        abi: KaelisCampaignManagerABI as any,
        functionName: 'sealCampaign',
        args: [campaignId],
      });

      setStep('done');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create distribution.');
      setStep('review');
    }
  }

  if (!isConnected) {
    return (
      <>
        <TopBar title="Create Distribution" />
        <div className="kaelis-page">
          <div className="kaelis-empty-banner">Connect your wallet to create a distribution.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Create Distribution" />
      <div className="kaelis-page kaelis-page--narrow">
        <div className="kaelis-wizard-steps">
          {(['details', 'recipients', 'review'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`kaelis-wizard-step${step === s ? ' kaelis-wizard-step--active' : ''}`}
            >
              <span className="kaelis-wizard-step__num">{i + 1}</span>
              {s === 'details' ? 'Campaign details' : s === 'recipients' ? 'Recipients' : 'Review & deploy'}
            </div>
          ))}
        </div>

        {formError && <div className="kaelis-empty-banner kaelis-empty-banner--error">{formError}</div>}

        {step === 'details' && (
          <div className="kaelis-card">
            <h2 className="kaelis-form-title">Campaign details</h2>

            <label className="kaelis-field">
              <span>Distribution type</span>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value as CampaignTypeKey)}
              >
                <option value="Airdrop">Airdrop — immediate unlock</option>
                <option value="Vesting">Vesting — linear with optional cliff</option>
                <option value="Payroll">Payroll — recurring linear unlock</option>
                <option value="Grant">Grant — vesting + milestones</option>
              </select>
            </label>

            <label className="kaelis-field">
              <span>Confidential token address</span>
              <input
                type="text"
                placeholder="0x..."
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="kaelis-mono-input"
              />
            </label>

            {needsSchedule && (
              <div className="kaelis-field-row">
                <label className="kaelis-field">
                  <span>Start date</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </label>
                <label className="kaelis-field">
                  <span>Cliff (days)</span>
                  <input type="number" min={0} value={cliffDays} onChange={(e) => setCliffDays(e.target.value)} />
                </label>
                <label className="kaelis-field">
                  <span>Vesting duration (days)</span>
                  <input type="number" min={1} value={vestingDays} onChange={(e) => setVestingDays(e.target.value)} />
                </label>
              </div>
            )}

            <button
              className="kaelis-btn kaelis-btn--primary"
              onClick={() => {
                const err = validateDetails();
                if (err) {
                  setFormError(err);
                  return;
                }
                setFormError(null);
                setStep('recipients');
              }}
            >
              Continue
            </button>
          </div>
        )}

        {step === 'recipients' && (
          <div className="kaelis-card">
            <h2 className="kaelis-form-title">Recipients & allocations</h2>
            <p className="kaelis-form-hint">
              Allocation amounts are encrypted in your browser before submission and
              never appear on-chain in plaintext.
            </p>

            {recipients.map((r, i) => (
              <div className="kaelis-field-row" key={i}>
                <label className="kaelis-field kaelis-field--grow">
                  <span>Recipient address</span>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={r.address}
                    onChange={(e) => updateRecipient(i, 'address', e.target.value)}
                    className="kaelis-mono-input"
                  />
                </label>
                <label className="kaelis-field">
                  <span>Allocation</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="1000"
                    value={r.allocation}
                    onChange={(e) => updateRecipient(i, 'allocation', e.target.value)}
                  />
                </label>
                {recipients.length > 1 && (
                  <button
                    className="kaelis-btn kaelis-btn--icon"
                    onClick={() => removeRecipientRow(i)}
                    aria-label="Remove recipient"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button className="kaelis-btn kaelis-btn--secondary" onClick={addRecipientRow}>
              + Add recipient
            </button>

            <div className="kaelis-wizard-actions">
              <button className="kaelis-btn kaelis-btn--secondary" onClick={() => setStep('details')}>
                Back
              </button>
              <button
                className="kaelis-btn kaelis-btn--primary"
                onClick={() => {
                  const err = validateRecipients();
                  if (err) {
                    setFormError(err);
                    return;
                  }
                  setFormError(null);
                  setStep('review');
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="kaelis-card">
            <h2 className="kaelis-form-title">Review & deploy</h2>
            <dl className="kaelis-review-list">
              <div>
                <dt>Type</dt>
                <dd>{campaignType}</dd>
              </div>
              <div>
                <dt>Token</dt>
                <dd className="kaelis-mono">{tokenAddress}</dd>
              </div>
              <div>
                <dt>Recipients</dt>
                <dd>{recipients.length}</dd>
              </div>
              <div>
                <dt>Total to mint</dt>
                <dd>{recipients.reduce((sum, r) => sum + (Number(r.allocation) || 0), 0).toLocaleString()}</dd>
              </div>
              {needsSchedule && (
                <div>
                  <dt>Schedule</dt>
                  <dd>
                    Starts {startDate}, {cliffDays}d cliff, {vestingDays}d total vesting
                  </dd>
                </div>
              )}
            </dl>
            <p className="kaelis-form-hint">
              This will first mint the total allocation into the campaign pool, then
              encrypt and submit each recipient allocation as a separate transaction.
              You&apos;ll be asked to confirm several transactions in your wallet.
            </p>
            <div className="kaelis-wizard-actions">
              <button className="kaelis-btn kaelis-btn--secondary" onClick={() => setStep('recipients')}>
                Back
              </button>
              <button className="kaelis-btn kaelis-btn--primary" onClick={handleSubmitCampaign}>
                Deploy confidential distribution
              </button>
            </div>
          </div>
        )}

        {step === 'submitting' && (
          <div className="kaelis-card kaelis-card--center">
            <div className="kaelis-processing">
              <Spinner />
              <p>{progressLabel}</p>
              <TxStatusBanner status={status} errorMessage={errorMessage} txHash={txHash} />
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="kaelis-card kaelis-card--center">
            <SuccessIcon />
            <h2>Distribution created</h2>
            <p className="kaelis-form-hint">
              Recipient allocations are encrypted on-chain. Recipients can now verify
              eligibility and claim from the Claims page.
            </p>
            <button className="kaelis-btn kaelis-btn--primary" onClick={() => router.push('/app/distributions')}>
              View distributions
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Spinner() {
  return (
    <svg className="kaelis-spinner kaelis-spinner--large" width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="13" stroke="var(--kaelis-line)" strokeWidth="3" />
      <path d="M29 16A13 13 0 0 0 16 3" stroke="var(--kaelis-gold)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="22" stroke="var(--kaelis-success)" strokeWidth="2" />
      <path d="M14 24.5 20.5 31 34 16" stroke="var(--kaelis-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
                }
            
