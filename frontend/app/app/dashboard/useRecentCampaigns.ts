'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { CONTRACTS, KaelisCampaignManagerABI, CAMPAIGN_TYPE_LABELS, CAMPAIGN_STATUS_LABELS } from '../../../lib/contracts';

export interface RecentCampaign {
  id: bigint;
  campaignType: string;
  status: string;
  recipientCount: number;
  createdAt: Date;
}

/**
 * Reads real Campaign structs via getCampaign(id) for the most recently created
 * campaign ids (derived from campaignCount()). No mock rows -- if the contract has
 * zero campaigns, this returns an empty array and the UI shows a genuine empty state.
 */
export function useRecentCampaigns(limit = 5) {
  const publicClient = usePublicClient();
  const [campaigns, setCampaigns] = useState<RecentCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isDeployed = CONTRACTS.KaelisCampaignManager !== '0x0000000000000000000000000000000000000000';

  useEffect(() => {
    if (!publicClient || !isDeployed) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      setIsLoading(true);
      try {
        const count = (await publicClient!.readContract({
          address: CONTRACTS.KaelisCampaignManager,
          abi: KaelisCampaignManagerABI as any,
          functionName: 'campaignCount',
        })) as bigint;

        const total = Number(count);
        if (total === 0) {
          if (!cancelled) {
            setCampaigns([]);
            setIsLoading(false);
          }
          return;
        }

        const idsToFetch = Array.from(
          { length: Math.min(limit, total) },
          (_, i) => BigInt(total - 1 - i)
        );

        const results = await Promise.all(
          idsToFetch.map((id) =>
            publicClient!.readContract({
              address: CONTRACTS.KaelisCampaignManager,
              abi: KaelisCampaignManagerABI as any,
              functionName: 'getCampaign',
              args: [id],
            })
          )
        );

        if (cancelled) return;

        const parsed: RecentCampaign[] = results.map((raw: any, i) => ({
          id: idsToFetch[i],
          campaignType: CAMPAIGN_TYPE_LABELS[raw.campaignType] ?? 'Unknown',
          status: CAMPAIGN_STATUS_LABELS[raw.status] ?? 'Unknown',
          recipientCount: raw.recipientCount,
          createdAt: new Date(Number(raw.createdAt) * 1000),
        }));

        setCampaigns(parsed);
      } catch {
        if (!cancelled) setCampaigns([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [publicClient, isDeployed, limit]);

  return { campaigns, isLoading, isDeployed };
}
