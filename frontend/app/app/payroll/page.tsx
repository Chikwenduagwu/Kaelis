'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { TopBar } from '../components/TopBar';
import { PageHero } from '../components/PageHero';
import { CampaignTypeList } from '../distributions/CampaignTypeList';
import { useCampaignsByType } from '../distributions/useCampaignsByType';

export default function PayrollPage() {
  const { isConnected } = useAccount();
  const { campaigns, isLoading, isDeployed } = useCampaignsByType('Payroll');

  return (
    <>
      <TopBar title="Payroll" />
      <div className="kaelis-page">
        <PageHero
          title="Payroll"
          subtitle="Recurring confidential payroll with a linear unlock schedule."
          action={
            <Link href="/app/distributions/new" className="kaelis-btn kaelis-btn--primary">
              + New payroll
            </Link>
          }
        />

        {!isConnected && (
          <div className="kaelis-empty-banner">Connect your wallet to view payroll campaigns.</div>
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
          emptyMessage="No payroll campaigns yet."
          emptyActionLabel="Set up payroll"
        />
      </div>
    </>
  );
}
