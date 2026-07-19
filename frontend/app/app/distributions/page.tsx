'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { TopBar } from '../components/TopBar';
import { PageHero } from '../components/PageHero';
import { CampaignTypeList } from './CampaignTypeList';
import { useRecentCampaigns } from '../dashboard/useRecentCampaigns';

export default function DistributionsPage() {
  const { isConnected } = useAccount();
  const { campaigns, isLoading, isDeployed } = useRecentCampaigns(50);

  return (
    <>
      <TopBar title="Distributions" />
      <div className="kaelis-page">
        <PageHero
          title="Distributions"
          subtitle="Create and manage confidential distributions."
          action={
            <Link href="/app/distributions/new" className="kaelis-btn kaelis-btn--primary">
              + New distribution
            </Link>
          }
        />

        {!isConnected && (
          <div className="kaelis-empty-banner">Connect your wallet to view distributions.</div>
        )}

        {isConnected && !isDeployed && (
          <div className="kaelis-empty-banner">
            Contracts not yet deployed to this network. Run{' '}
            <code>npm run deploy:sepolia</code>.
          </div>
        )}

        <CampaignTypeList
          campaigns={campaigns}
          isLoading={isLoading}
          emptyMessage="No distributions yet."
        />
      </div>
    </>
  );
}
