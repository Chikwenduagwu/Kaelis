'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { TopBar } from './components/TopBar';
import { StatCard } from './dashboard/StatCard';
import { ActivityChart } from './dashboard/ActivityChart';
import { useDashboardStats } from './dashboard/useDashboardStats';
import { useRecentCampaigns } from './dashboard/useRecentCampaigns';
import { VaultIllustration } from '../landing/VaultIllustration';

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { campaignCount, recipientCount, activeCampaignCount, isLoading, isDeployed, error } =
    useDashboardStats();
  const { campaigns, isLoading: campaignsLoading } = useRecentCampaigns();

  return (
    <>
      <TopBar title="Overview" />
      <div className="kaelis-page">
        <div className="kaelis-dashboard-header">
          <div className="kaelis-dashboard-header__copy">
            <span className="kaelis-dashboard-header__greeting">Welcome back 👋</span>
            <h1 className="kaelis-dashboard-header__title">Overview</h1>
            <p className="kaelis-page__subtitle">Your confidential operations at a glance.</p>
          </div>
          <div className="kaelis-dashboard-header__illustration">
            <VaultIllustration />
          </div>
        </div>

        <div className="kaelis-privacy-banner">
          <LockIcon />
          <span>All sensitive data is encrypted and private by design.</span>
          <ChevronIcon />
        </div>

        {!isConnected && (
          <div className="kaelis-empty-banner">
            Connect your wallet to view live campaign data from Sepolia.
          </div>
        )}

        {isConnected && !isDeployed && (
          <div className="kaelis-empty-banner">
            Contracts not yet deployed to this network. Run{' '}
            <code>npm run deploy:sepolia</code> and update{' '}
            <code>lib/contracts.ts</code>.
          </div>
        )}

        {error && <div className="kaelis-empty-banner kaelis-empty-banner--error">{error}</div>}

        <div className="kaelis-stat-grid">
          <StatCard
            label="Total Distributions"
            value={campaignCount.toLocaleString()}
            sublabel="All time"
            icon="distributions"
            isLoading={isLoading}
            badge="trend-up"
          />
          <StatCard
            label="Total Recipients"
            value={recipientCount.toLocaleString()}
            sublabel="Across all campaigns"
            icon="claimed"
            isLoading={isLoading}
            badge="trend-up"
          />
          <StatCard
            label="Active Campaigns"
            value={activeCampaignCount.toLocaleString()}
            sublabel="Running"
            icon="active"
            isLoading={isLoading}
            badge="active-dot"
          />
          <StatCard
            label="Confidential Amounts"
            value="Encrypted"
            sublabel="Amounts are private"
            icon="value"
            badge="hidden"
          />
        </div>

        <ActivityChart
          distributionCount={campaignCount}
          recipientCount={recipientCount}
          isLoading={isLoading}
        />

        <div className="kaelis-card kaelis-recent-campaigns">
          <div className="kaelis-card__header">
            <h2>Recent Campaigns</h2>
            <Link href="/app/distributions">View all</Link>
          </div>

          {campaignsLoading ? (
            <div className="kaelis-skeleton-list">
              {[0, 1, 2].map((i) => (
                <div className="kaelis-skeleton-row" key={i} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="kaelis-empty-state">
              <p>No campaigns yet.</p>
              <Link href="/app/distributions/new" className="kaelis-btn kaelis-btn--primary">
                Create your first distribution
              </Link>
            </div>
          ) : (
            <ul className="kaelis-campaign-list">
              {campaigns.map((c) => (
                <li key={c.id.toString()} className="kaelis-campaign-row">
                  <div className="kaelis-campaign-row__icon">
                    <CampaignTypeIcon />
                  </div>
                  <div className="kaelis-campaign-row__main">
                    <span className="kaelis-campaign-row__id">Campaign #{c.id.toString()}</span>
                    <span className="kaelis-tag">{c.campaignType}</span>
                  </div>
                  <span className="kaelis-campaign-row__recipients">
                    {c.recipientCount} recipient{c.recipientCount === 1 ? '' : 's'}
                  </span>
                  <span
                    className={`kaelis-status-pill kaelis-status-pill--${c.status.toLowerCase()}`}
                  >
                    {c.status}
                  </span>
                  <ChevronRightIcon />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="9" width="12" height="8" rx="2" stroke="var(--kaelis-gold)" strokeWidth="1.4" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="var(--kaelis-gold)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7.5 5l5 5-5 5" stroke="var(--kaelis-ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

function CampaignTypeIcon() {
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
