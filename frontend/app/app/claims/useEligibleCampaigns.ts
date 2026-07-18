'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { CONTRACTS, KaelisCampaignManagerABI, CAMPAIGN_TYPE_LABELS, SUPPORTED_TOKENS } from '../../../lib/contracts';

export interface EligibleCampaign {
  id: bigint;
  campaignType: string;
  tokenSymbol: string;
  status: number; // 0 = Active, 1 = Paused, 2 = Completed
  allocation: bigint;
  claimed: bigint;
  isFullyClaimed: boolean;
}

/**
 * Scans every campaign (0..campaignCount()) checking isRecipient(id, address) for
 * the connected wallet, then decrypts BOTH the allocation and claimed-so-far handles
 * for each eligible campaign to determine real claim status up front.
 *
 * This requires a wallet signature per decrypted handle (2 per eligible campaign) --
 * a real UX cost, but the alternative (not checking) is exactly the bug being fixed
 * here: a recipient re-running claim() on an already-fully-claimed campaign gets a
 * technically-successful but zero-value transaction, which without this check reads
 * to the user as "I claimed again" with no indication nothing new was actually paid
 * out. Deciding claim status from real decrypted amounts, not just campaign
 * metadata, is what makes "already claimed" an honest, accurate state rather than a
 * guess.
 *
 * Bounded, small-scale reads (isRecipient + getCampaign + getAllocationHandle +
 * getClaimedHandle are plain contract calls, not eth_getLogs), so this doesn't hit
 * the block-range limits that broke the dashboard's old getLogs-based approach.
 */
export function useEligibleCampaigns(
  address: `0x${string}` | undefined,
  decryptHandle: (handle: `0x${string}`) => Promise<bigint>,
  isDecryptReady: boolean
) {
  const publicClient = usePublicClient();
  const [campaigns, setCampaigns] = useState<EligibleCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDeployed = CONTRACTS.KaelisCampaignManager !== '0x0000000000000000000000000000000000000000';

  useEffect(() => {
    // Wait for BOTH an address AND a fully-ready wallet client (isDecryptReady) --
    // wagmi's useAccount() can resolve `address` on an earlier render than
    // useWalletClient() resolves the actual signer object, and this effect needs a
    // real signer to call decryptHandle. Gating on address alone caused a real bug:
    // the effect would fire in that gap and throw "Wallet not connected" even though
    // the UI already showed a connected wallet.
    if (!publicClient || !isDeployed || !address || !isDecryptReady) {
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

        // Decrypt allocation + claimed for each eligible campaign, sequentially --
        // each decrypt is a signed request, so running them one at a time avoids
        // firing a burst of simultaneous wallet signature prompts.
        const claimStatuses: Array<{ allocation: bigint; claimed: bigint }> = [];
        for (const id of eligibleIds) {
          const [allocationHandle, claimedHandle] = await Promise.all([
            publicClient!.readContract({
              address: CONTRACTS.KaelisCampaignManager,
              abi: KaelisCampaignManagerABI as any,
              functionName: 'getAllocationHandle',
              args: [id, address],
            }) as Promise<`0x${string}`>,
            publicClient!.readContract({
              address: CONTRACTS.KaelisCampaignManager,
              abi: KaelisCampaignManagerABI as any,
              functionName: 'getClaimedHandle',
              args: [id, address],
            }) as Promise<`0x${string}`>,
          ]);

          const [allocation, claimed] = await Promise.all([
            decryptHandle(allocationHandle),
            decryptHandle(claimedHandle),
          ]);

          claimStatuses.push({ allocation, claimed });
        }

        if (cancelled) return;

        const parsed: EligibleCampaign[] = campaignDetails.map((raw: any, i) => ({
          id: eligibleIds[i],
          campaignType: CAMPAIGN_TYPE_LABELS[raw.campaignType] ?? 'Unknown',
          tokenSymbol:
            SUPPORTED_TOKENS.find((t) => t.address.toLowerCase() === raw.token.toLowerCase())?.symbol ??
            'Unknown',
          status: raw.status,
          allocation: claimStatuses[i].allocation,
          claimed: claimStatuses[i].claimed,
          isFullyClaimed: claimStatuses[i].claimed >= claimStatuses[i].allocation,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, isDeployed, address, isDecryptReady]);

  return { campaigns, isLoading, error, isDeployed };
}
