'use client';

import { useEffect, useState } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { CONTRACTS } from '../../../lib/contracts';

export interface DashboardStats {
  campaignCount: number;
  claimCount: number;
  activeCampaignCount: number;
  isLoading: boolean;
  error: string | null;
  isDeployed: boolean;
}

const CAMPAIGN_CREATED_EVENT = {
  type: 'event',
  name: 'CampaignCreated',
  inputs: [
    { name: 'campaignId', type: 'uint256', indexed: true },
    { name: 'creator', type: 'address', indexed: true },
    { name: 'campaignType', type: 'uint8', indexed: false },
    { name: 'token', type: 'address', indexed: false },
    { name: 'startTime', type: 'uint64', indexed: false },
    { name: 'cliffDuration', type: 'uint64', indexed: false },
    { name: 'vestingDuration', type: 'uint64', indexed: false },
  ],
} as const;

const CLAIMED_EVENT = {
  type: 'event',
  name: 'Claimed',
  inputs: [
    { name: 'campaignId', type: 'uint256', indexed: true },
    { name: 'recipient', type: 'address', indexed: true },
  ],
} as const;

const CAMPAIGN_STATUS_CHANGED_EVENT = {
  type: 'event',
  name: 'CampaignStatusChanged',
  inputs: [
    { name: 'campaignId', type: 'uint256', indexed: true },
    { name: 'status', type: 'uint8', indexed: false },
  ],
} as const;

/**
 * All numbers here come from real on-chain event logs against the deployed
 * KaelisCampaignManager -- no placeholder statistics. "Active campaigns" is computed
 * by taking every CampaignCreated id (which defaults to Active per the contract) and
 * subtracting any that have since emitted CampaignStatusChanged to Paused/Completed
 * (status 1 or 2), using each campaign's most recent status-change event.
 */
export function useDashboardStats(): DashboardStats {
  const publicClient = usePublicClient();
  const { chain } = useAccount();
  const [stats, setStats] = useState<Omit<DashboardStats, 'isLoading' | 'error' | 'isDeployed'>>({
    campaignCount: 0,
    claimCount: 0,
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
        const [createdLogs, claimedLogs, statusLogs] = await Promise.all([
          publicClient!.getLogs({
            address: CONTRACTS.KaelisCampaignManager,
            event: CAMPAIGN_CREATED_EVENT,
            fromBlock: 'earliest',
            toBlock: 'latest',
          }),
          publicClient!.getLogs({
            address: CONTRACTS.KaelisCampaignManager,
            event: CLAIMED_EVENT,
            fromBlock: 'earliest',
            toBlock: 'latest',
          }),
          publicClient!.getLogs({
            address: CONTRACTS.KaelisCampaignManager,
            event: CAMPAIGN_STATUS_CHANGED_EVENT,
            fromBlock: 'earliest',
            toBlock: 'latest',
          }),
        ]);

        if (cancelled) return;

        const latestStatusByCampaign = new Map<string, number>();
        for (const log of statusLogs as any[]) {
          const id = log.args.campaignId.toString();
          // getLogs returns in ascending block order, so the last write per id wins.
          latestStatusByCampaign.set(id, log.args.status);
        }

        const activeCount = (createdLogs as any[]).filter((log) => {
          const id = log.args.campaignId.toString();
          const status = latestStatusByCampaign.get(id) ?? 0; // 0 = Active default
          return status === 0;
        }).length;

        setStats({
          campaignCount: createdLogs.length,
          claimCount: claimedLogs.length,
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
