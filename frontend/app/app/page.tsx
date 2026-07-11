'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { TopBar } from './components/TopBar';
import { StatCard } from './dashboard/StatCard';
import { useDashboardStats } from './dashboard/useDashboardStats';
import { useRecentCampaigns } from './dashboard/useRecentCampaigns';

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { campaignCount, claimCount, activeCampaignCount, isLoading, isDeployed, error } =
    useDashboardStats();
  const { campaigns, isLoading: campaignsLoading } = useRecentCampaigns();

  return (
    <>
      <TopBar title="Overview" />
      <div className="kaelis-page">
        <p className="kaelis-page__subtitle">Your confidential operations at a glance.</p>

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
          />
          <StatCard
            label="Total Claims"
            value={claimCount.toLocaleString()}
            sublabel="All time"
            icon="claimed"
            isLoading={isLoading}
          />
          <StatCard
            label="Active Campaigns"
            value={activeCampaignCount.toLocaleString()}
            sublabel="Running"
            icon="active"
            isLoading={isLoading}
          />
          <StatCard
            label="Confidential Amounts"
            value="Encrypted"
            sublabel="Amounts are private by design"
            icon="value"
          />
        </div>

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
                  <div>
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
