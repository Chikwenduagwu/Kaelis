'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { CONTRACTS, KaelisCampaignManagerABI, CAMPAIGN_TYPE_LABELS, CAMPAIGN_STATUS_LABELS, CAMPAIGN_TYPE } from '../../../lib/contracts';
import type { RecentCampaign } from '../dashboard/useRecentCampaigns';

/**
 * Fetches every campaign (0..campaignCount()) and returns only the ones matching
 * `campaignType`. Unlike useRecentCampaigns (which caps how many of the MOST RECENT
 * campaigns it fetches before any filtering), this needs to see every campaign to
 * answer "show me all Vesting campaigns" correctly -- a recent-N cutoff could hide a
 * real Vesting campaign that simply isn't among the newest few, which would make a
 * dedicated Vesting page silently incomplete.
 *
 * Still bounded, plain contract reads (getCampaign per id, not eth_getLogs), so this
 * doesn't reintroduce the RPC block-range problems that broke the dashboard earlier
 * -- it scales with campaignCount(), which for this project stays small.
 */
export function useCampaignsByType(campaignType: keyof typeof CAMPAIGN_TYPE) {
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

        // Newest first, matching useRecentCampaigns' ordering convention.
        const ids = Array.from({ length: total }, (_, i) => BigInt(total - 1 - i));

        const results = await Promise.all(
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

        const targetTypeValue = CAMPAIGN_TYPE[campaignType];

        const parsed: RecentCampaign[] = results
          .map((raw: any, i) => ({
            id: ids[i],
            campaignType: CAMPAIGN_TYPE_LABELS[raw.campaignType] ?? 'Unknown',
            campaignTypeValue: raw.campaignType,
            status: CAMPAIGN_STATUS_LABELS[raw.status] ?? 'Unknown',
            recipientCount: raw.recipientCount,
            createdAt: new Date(Number(raw.createdAt) * 1000),
            token: raw.token,
          }))
          .filter((c) => c.campaignTypeValue === targetTypeValue);

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
  }, [publicClient, isDeployed, campaignType]);

  return { campaigns, isLoading, isDeployed };
}
