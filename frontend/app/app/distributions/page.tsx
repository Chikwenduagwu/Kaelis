'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { TopBar } from '../components/TopBar';
import { useRecentCampaigns } from '../dashboard/useRecentCampaigns';

export default function DistributionsPage() {
  const { isConnected } = useAccount();
  const { campaigns, isLoading, isDeployed } = useRecentCampaigns(50);

  return (
    <>
      <TopBar title="Distributions" />
      <div className="kaelis-page">
        <div className="kaelis-page__header-row">
          <p className="kaelis-page__subtitle">Create and manage confidential distributions.</p>
          <Link href="/app/distributions/new" className="kaelis-btn kaelis-btn--primary">
            + New distribution
          </Link>
        </div>

        {!isConnected && (
          <div className="kaelis-empty-banner">Connect your wallet to view distributions.</div>
        )}

        {isConnected && !isDeployed && (
          <div className="kaelis-empty-banner">
            Contracts not yet deployed to this network. Run{' '}
            <code>npm run deploy:sepolia</code>.
          </div>
        )}

        <div className="kaelis-card">
          {isLoading ? (
            <div className="kaelis-skeleton-list">
              {[0, 1, 2, 3].map((i) => (
                <div className="kaelis-skeleton-row" key={i} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="kaelis-empty-state">
              <p>No distributions yet.</p>
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
                  <span className="kaelis-campaign-row__recipients">
                    {c.createdAt.toLocaleDateString()}
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
