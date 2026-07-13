'use client';

import { useEffect, useState } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { CONTRACTS, KaelisCampaignManagerABI } from '../../../lib/contracts';

export interface DashboardStats {
  campaignCount: number;
  recipientCount: number;
  activeCampaignCount: number;
  isLoading: boolean;
  error: string | null;
  isDeployed: boolean;
}

/**
 * All numbers here come from real on-chain contract reads (campaignCount() +
 * getCampaign(i) for every campaign) against the deployed KaelisCampaignManager --
 * no placeholder statistics, and critically, no eth_getLogs calls.
 *
 * This deliberately replaces an earlier version that used getLogs to scan
 * CampaignCreated/Claimed/CampaignStatusChanged event history. That approach hit a
 * wall in production: every free-tier RPC provider caps eth_getLogs block ranges
 * differently and often very tightly (thirdweb: 1,000 blocks; Alchemy free tier: just
 * 10 blocks per call), making a wide-range scan either fail outright or require
 * thousands of chunked requests per page load. Plain contract reads (readContract /
 * multicall-style calls) have no equivalent range restriction on any provider, so
 * rebuilding this around getCampaign() reads is far more robust for a public
 * deployment, at the cost of dropping "Total Claims" (there is no on-chain claim
 * counter -- claimed amounts are encrypted euint256 handles, so "has this recipient
 * claimed" isn't cheaply readable without decryption). "Total Recipients across all
 * campaigns" is shown instead as an honestly-derivable substitute metric.
 */
export function useDashboardStats(): DashboardStats {
  const publicClient = usePublicClient();
  const { chain } = useAccount();
  const [stats, setStats] = useState<Omit<DashboardStats, 'isLoading' | 'error' | 'isDeployed'>>({
    campaignCount: 0,
    recipientCount: 0,
    activeCampaignCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDeployed = CONTRACTS.KaelisCampaignManager !== '0x0000000000000000000000000000000000000000';

  useEffect(() => {
    if (!publicClient || !isDeployed) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const count = (await publicClient!.readContract({
          address: CONTRACTS.KaelisCampaignManager,
          abi: KaelisCampaignManagerABI as any,
          functionName: 'campaignCount',
        })) as bigint;

        const total = Number(count);

        if (total === 0) {
          if (!cancelled) {
            setStats({ campaignCount: 0, recipientCount: 0, activeCampaignCount: 0 });
          }
          return;
        }

        const ids = Array.from({ length: total }, (_, i) => BigInt(i));
        const campaigns = await Promise.all(
          ids.map((id) =>
            publicClient!.readContract({
              address: CONTRACTS.KaelisCampaignManager,
              abi: KaelisCampaignManagerABI as any,
              functionName: 'getCampaign',
              args: [id],
            })
          )
        );

        if (cancelled) return;

        let activeCount = 0;
        let recipientCount = 0;
        for (const raw of campaigns as any[]) {
          if (raw.status === 0) activeCount += 1;
          recipientCount += Number(raw.recipientCount);
        }

        setStats({
          campaignCount: total,
          recipientCount,
          activeCampaignCount: activeCount,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard stats.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [publicClient, chain?.id, isDeployed]);

  return { ...stats, isLoading, error, isDeployed };
}
