'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { TopBar } from '../components/TopBar';
import { PageHero } from '../components/PageHero';
import { CampaignTypeList } from '../distributions/CampaignTypeList';
import { useCampaignsByType } from '../distributions/useCampaignsByType';

export default function GrantsPage() {
  const { isConnected } = useAccount();
  const { campaigns, isLoading, isDeployed } = useCampaignsByType('Grant');

  return (
    <>
      <TopBar title="Grants" />
      <div className="kaelis-page">
        <PageHero
          title="Grants"
          subtitle="Vesting gated by milestone completion."
          action={
            <Link href="/app/distributions/new" className="kaelis-btn kaelis-btn--primary">
              + New grant
            </Link>
          }
        />

        {!isConnected && (
          <div className="kaelis-empty-banner">Connect your wallet to view grant campaigns.</div>
        )}

        {isConnected && !isDeployed && (
          <div className="kaelis-empty-banner">
            Contracts not yet deployed to this network. Run{' '}
            <code>npm run deploy:sepolia</code>.
          </div>
        )}

        {/* Honest note: the contract exposes completeMilestone(), but there's no UI
            for a grant creator to actually call it yet. Grants can be created and
            claimed against normally, but milestone-gated unlock progression
            currently has to be done directly against the contract, not through this
            app. Flagged here rather than silently omitted. */}
        {isConnected && isDeployed && campaigns.length > 0 && (
          <div className="kaelis-empty-banner">
            Milestone management isn&apos;t built into this app yet — grant recipients
            can still claim what&apos;s currently unlocked, but marking milestones
            complete requires calling the contract directly for now.
          </div>
        )}

        <CampaignTypeList
          campaigns={campaigns}
          isLoading={isLoading}
          emptyMessage="No grants yet."
          emptyActionLabel="Create a grant"
        />
      </div>
    </>
  );
}
