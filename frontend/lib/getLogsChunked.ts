import type { PublicClient } from 'viem';

// Public/free-tier RPC providers (thirdweb, and many others) cap eth_getLogs at a
// maximum block range per call -- 10,000 is the most common limit seen in practice.
// Querying from block 'earliest' in one call exceeds this on any contract that isn't
// brand new, which is exactly the error this was hitting. Using a conservative chunk
// size under the common caps keeps this working across different RPC providers
// without needing to special-case any one of them.
const MAX_BLOCK_RANGE = 9_500n;

// How far back to search for events in total. Kaelis contracts are freshly deployed
// for this hackathon, so a lookback window comfortably covers "since deployment"
// without needing to know or hardcode the exact deployment block number. If a
// campaign somehow predates this window, campaignCount()-based reads elsewhere
// (useRecentCampaigns) remain accurate as a fallback since they don't depend on
// getLogs at all.
const LOOKBACK_BLOCKS = 500_000n;

/**
 * Fetches logs for a single event across a wide block range by splitting the query
 * into chunks that stay under the RPC provider's per-call block-range limit, then
 * concatenating the results. Queries run sequentially (not in parallel) to avoid
 * hammering free-tier rate limits with a burst of simultaneous requests.
 */
export async function getLogsChunked(
  publicClient: PublicClient,
  params: Omit<Parameters<PublicClient['getLogs']>[0], 'fromBlock' | 'toBlock'>
) {
  const latestBlock = await publicClient.getBlockNumber();
  const startBlock = latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : 0n;

  const allLogs: Awaited<ReturnType<PublicClient['getLogs']>> = [];
  let chunkStart = startBlock;

  while (chunkStart <= latestBlock) {
    const chunkEnd =
      chunkStart + MAX_BLOCK_RANGE > latestBlock ? latestBlock : chunkStart + MAX_BLOCK_RANGE;

    const logs = await publicClient.getLogs({
      ...params,
      fromBlock: chunkStart,
      toBlock: chunkEnd,
    } as Parameters<PublicClient['getLogs']>[0]);

    allLogs.push(...logs);
    chunkStart = chunkEnd + 1n;
  }

  return allLogs;
}
