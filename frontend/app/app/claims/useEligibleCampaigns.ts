'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { CONTRACTS, KaelisCampaignManagerABI, CAMPAIGN_TYPE_LABELS, SUPPORTED_TOKENS } from '../../../lib/contracts';

export interface EligibleCampaign {
  id: bigint;
  campaignType: string;
  tokenSymbol: string;
  status: number; // 0 = Active, 1 = Paused, 2 = Completed
}

/**
 * Scans every campaign (0..campaignCount()) checking isRecipient(id, address) for
 * the connected wallet, and returns the ones it's eligible on. This replaces manual
 * campaign-id entry on the Claims page with a real "here's what you can claim" list.
 *
 * Bounded, small-scale reads (isRecipient + getCampaign are plain contract calls, not
 * eth_getLogs), so this doesn't hit the block-range limits that broke the dashboard's
 * old getLogs-based approach -- it scales with campaignCount(), which for this
 * project is a small number, not with block range.
 */
export function useEligibleCampaigns(address: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  const [campaigns, setCampaigns] = useState<EligibleCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDeployed = CONTRACTS.KaelisCampaignManager !== '0x0000000000000000000000000000000000000000';

  useEffect(() => {
    if (!publicClient || !isDeployed || !address) {
      setIsLoading(false);
      setCampaigns([]);
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
            setCampaigns([]);
            setIsLoading(false);
          }
          return;
        }

        const ids = Array.from({ length: total }, (_, i) => BigInt(i));

        const eligibilityChecks = await Promise.all(
          ids.map((id) =>
            publicClient!.readContract({
              address: CONTRACTS.KaelisCampaignManager,
              abi: KaelisCampaignManagerABI as any,
              functionName: 'isRecipient',
              args: [id, address],
            })
          )
        );

        const eligibleIds = ids.filter((_, i) => eligibilityChecks[i] === true);

        if (eligibleIds.length === 0) {
          if (!cancelled) {
            setCampaigns([]);
            setIsLoading(false);
          }
          return;
        }

        const campaignDetails = await Promise.all(
          eligibleIds.map((id) =>
            publicClient!.readContract({
              address: CONTRACTS.KaelisCampaignManager,
              abi: KaelisCampaignManagerABI as any,
              functionName: 'getCampaign',
              args: [id],
            })
          )
        );

        if (cancelled) return;

        const parsed: EligibleCampaign[] = campaignDetails.map((raw: any, i) => ({
          id: eligibleIds[i],
          campaignType: CAMPAIGN_TYPE_LABELS[raw.campaignType] ?? 'Unknown',
          tokenSymbol:
            SUPPORTED_TOKENS.find((t) => t.address.toLowerCase() === raw.token.toLowerCase())?.symbol ??
            'Unknown',
          status: raw.status,
        }));

        setCampaigns(parsed);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to check eligibility.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [publicClient, isDeployed, address]);

  return { campaigns, isLoading, error, isDeployed };
    }
              
