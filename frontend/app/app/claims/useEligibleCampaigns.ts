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
 * the connected wallet, then reads plain (non-encrypted) campaign metadata for the
 * ones the wallet is eligible for.
 *
 * Deliberately does NOT decrypt allocation/claimed amounts here -- that used to
 * happen automatically for every eligible campaign on page load, which meant up to
 * 2 wallet signature prompts per campaign before the user had done anything. That
 * decryption now happens on demand, per campaign, only when the user explicitly
 * clicks "Check Claim Status" on that row (see useClaimStatus.ts). This hook's job
 * is just: "which campaigns can this wallet see," fast and silent.
 *
 * Bounded, small-scale reads (isRecipient + getCampaign are plain contract calls,
 * not eth_getLogs), so this doesn't hit the block-range limits that broke the
 * dashboard's old getLogs-based approach.
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
