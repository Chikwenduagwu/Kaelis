import type { TxStatus } from '../../../lib/useContractTransaction';

interface TxStatusBannerProps {
  status: TxStatus;
  errorMessage: string | null;
  txHash: `0x${string}` | null;
  pendingLabel?: string;
  successLabel?: string;
}

export function TxStatusBanner({
  status,
  errorMessage,
  txHash,
  pendingLabel = 'Waiting for confirmation on Sepolia…',
  successLabel = 'Confirmed.',
}: TxStatusBannerProps) {
  if (status === 'idle') return null;

  return (
    <div className={`kaelis-tx-banner kaelis-tx-banner--${status}`}>
      {status === 'signing' && (
        <>
          <Spinner />
          <span>Confirm this transaction in your wallet…</span>
        </>
      )}
      {status === 'pending' && (
        <>
          <Spinner />
          <span>{pendingLabel}</span>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckIcon />
          <span>{successLabel}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <ErrorIcon />
          <span>{errorMessage ?? 'Something went wrong.'}</span>
        </>
      )}
      {txHash && (status === 'pending' || status === 'success') && (
        <a
          href={`https://sepolia.etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="kaelis-tx-banner__link"
        >
          View on Etherscan
        </a>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="kaelis-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4" stroke="var(--kaelis-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="var(--kaelis-danger)" strokeWidth="1.5" />
      <path d="M8 5v4M8 11h.01" stroke="var(--kaelis-danger)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
