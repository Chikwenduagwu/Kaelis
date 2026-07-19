import Link from 'next/link';
import { SUPPORTED_TOKENS } from '../../../lib/contracts';
import { formatRelativeTime } from '../../../lib/formatRelativeTime';
import type { RecentCampaign } from '../dashboard/useRecentCampaigns';

const TYPE_ICON_PATHS: Record<string, string> = {
  Airdrop: 'M10 2 L17 5.5 V9 C17 13.5 14 17.5 10 18.5 C6 17.5 3 13.5 3 9 V5.5 Z',
  Vesting: 'M3 15l4-5 4 3 6-8',
  Payroll: 'M3 6h14v10H3zM3 9h14',
  Grant: 'M10 2l2.5 5.5L18 9l-4.5 4L14.5 18 10 15l-4.5 3 1-5L2 9l5.5-1.5z',
};

interface CampaignTypeListProps {
  campaigns: RecentCampaign[];
  isLoading: boolean;
  emptyMessage: string;
  emptyActionLabel?: string;
}

/**
 * Shared row-list renderer used by Distributions (all types) and the per-type pages
 * (Vesting, Payroll, Grants) -- each page passes in campaigns already filtered to the
 * type it cares about, so this component itself has no type-filtering logic, only
 * presentation. Keeping this shared avoids the four pages drifting out of sync on
 * row styling/behavior over time.
 */
export function CampaignTypeList({
  campaigns,
  isLoading,
  emptyMessage,
  emptyActionLabel = 'Create your first distribution',
}: CampaignTypeListProps) {
  function tokenSymbol(address: string) {
    return SUPPORTED_TOKENS.find((t) => t.address.toLowerCase() === address.toLowerCase())?.symbol ?? 'Unknown';
  }

  return (
    <div className="kaelis-distributions-list">
      {isLoading ? (
        <div className="kaelis-skeleton-list">
          {[0, 1, 2].map((i) => (
            <div className="kaelis-skeleton-row" key={i} />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="kaelis-empty-state">
          <p>{emptyMessage}</p>
          <Link href="/app/distributions/new" className="kaelis-btn kaelis-btn--primary">
            {emptyActionLabel}
          </Link>
        </div>
      ) : (
        campaigns.map((c) => (
          <div key={c.id.toString()} className="kaelis-distribution-row">
            <div className={`kaelis-distribution-row__icon kaelis-distribution-row__icon--${c.campaignType.toLowerCase()}`}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d={TYPE_ICON_PATHS[c.campaignType] ?? TYPE_ICON_PATHS.Airdrop}
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="kaelis-distribution-row__main">
              <div className="kaelis-distribution-row__title-line">
                <span className="kaelis-distribution-row__title">{c.campaignType} Campaign</span>
                <span className={`kaelis-status-pill kaelis-status-pill--${c.status.toLowerCase()}`}>
                  {c.status}
                </span>
              </div>
              <div className="kaelis-distribution-row__meta">
                <span className="kaelis-distribution-row__token">
                  <LockIcon /> {tokenSymbol(c.token)}
                </span>
                <span className="kaelis-distribution-row__dot" aria-hidden />
                <span>
                  {c.recipientCount} recipient{c.recipientCount === 1 ? '' : 's'}
                </span>
                <span className="kaelis-distribution-row__dot" aria-hidden />
                <span>{formatRelativeTime(c.createdAt)}</span>
              </div>
            </div>

            <ChevronRightIcon />
          </div>
        ))
      )}
    </div>
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

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7.5 5l5 5-5 5" stroke="var(--kaelis-ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
            }
