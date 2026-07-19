'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { TopBar } from '../components/TopBar';
import { PageHero } from '../components/PageHero';
import { CampaignTypeList } from '../distributions/CampaignTypeList';
import { useCampaignsByType } from '../distributions/useCampaignsByType';

export default function VestingPage() {
  const { isConnected } = useAccount();
  const { campaigns, isLoading, isDeployed } = useCampaignsByType('Vesting');

  return (
    <>
      <TopBar title="Vesting" />
      <div className="kaelis-page">
        <PageHero
          title="Vesting"
          subtitle="Linear vesting schedules with an optional cliff."
          action={
            <Link href="/app/distributions/new" className="kaelis-btn kaelis-btn--primary">
              + New vesting schedule
            </Link>
          }
        />

        {!isConnected && (
          <div className="kaelis-empty-banner">Connect your wallet to view vesting campaigns.</div>
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
          emptyMessage="No vesting schedules yet."
          emptyActionLabel="Create a vesting schedule"
        />
      </div>
    </>
  );
}
