'use client';

import { useCallback, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { CONTRACTS, KaelisCampaignManagerABI } from '../../../lib/contracts';

export interface ClaimStatusResult {
  allocation: bigint;
  claimed: bigint;
  isFullyClaimed: boolean;
}

export type ClaimStatusState = 'idle' | 'checking' | 'done' | 'error';

/**
 * Decrypts allocation + claimed-so-far for a SINGLE campaign, on demand.
 *
 * This is what used to run automatically for every eligible campaign the moment
 * useEligibleCampaigns resolved -- 2 signature prompts per campaign, fired all at
 * once, before the user had asked to see anything. Now it's a per-campaign,
 * per-click action: the row shows a "Check Claim Status" button, and only that
 * row's two handles get decrypted when clicked. Results and status are keyed by
 * campaign id so each row's step is independent of the others.
 */
export function useClaimStatus(
  address: `0x${string}` | undefined,
  decryptHandle: (handle: `0x${string}`) => Promise<bigint>
) {
  const publicClient = usePublicClient();
  const [statusById, setStatusById] = useState<Record<string, ClaimStatusState>>({});
  const [resultById, setResultById] = useState<Record<string, ClaimStatusResult>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const checkClaimStatus = useCallback(
    async (id: bigint) => {
      if (!publicClient || !address) return;
      const key = id.toString();

      setStatusById((prev) => ({ ...prev, [key]: 'checking' }));
      setErrorById((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      try {
        const [allocationHandle, claimedHandle] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.KaelisCampaignManager,
            abi: KaelisCampaignManagerABI as any,
            functionName: 'getAllocationHandle',
            args: [id, address],
          }) as Promise<`0x${string}`>,
          publicClient.readContract({
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

        setResultById((prev) => ({
          ...prev,
          [key]: { allocation, claimed, isFullyClaimed: claimed >= allocation },
        }));
        setStatusById((prev) => ({ ...prev, [key]: 'done' }));
      } catch (err) {
        setErrorById((prev) => ({
          ...prev,
          [key]: err instanceof Error ? err.message : 'Failed to check claim status.',
        }));
        setStatusById((prev) => ({ ...prev, [key]: 'error' }));
      }
    },
    [publicClient, address, decryptHandle]
  );

  return { statusById, resultById, errorById, checkClaimStatus };
}
