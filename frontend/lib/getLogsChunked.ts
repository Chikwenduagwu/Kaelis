import type { PublicClient } from 'viem';

// Public/free-tier RPC providers cap eth_getLogs at a maximum block range per call.
// thirdweb's public Sepolia RPC enforces exactly 1,000 blocks per call (confirmed via
// its own error message: "Maximum allowed number of requested blocks is 1000") --
// other providers may allow more, but 1,000 is a safe floor that works everywhere.
const MAX_BLOCK_RANGE = 1_000n;

// How far back to search for events in total. Kaelis contracts are freshly deployed
// for this hackathon, so a lookback window comfortably covers "since deployment"
// without needing to know or hardcode the exact deployment block number. Kept modest
// specifically because MAX_BLOCK_RANGE is only 1,000 blocks (thirdweb's cap) -- a
// large lookback here means many sequential chunked requests, which gets slow and
// risks free-tier rate limits. 50,000 blocks is roughly 1 week of Sepolia's ~12s
// block time, comfortably covering a hackathon deployment's lifetime.
const LOOKBACK_BLOCKS = 50_000n;

/**
 * Fetches logs for a single event across a wide block range by splitting the query
 * into chunks that stay under the RPC provider's per-call block-range limit, then
 * concatenating the results. Chunks are fetched with limited concurrency (a handful
 * at a time) rather than one-by-one -- a 1,000-block cap over a 50,000-block window
 * means 50 chunks, and running those fully sequentially would be slow enough to
 * visibly delay the dashboard. A small concurrency cap keeps this fast without
 * bursting so many simultaneous requests that a free-tier RPC starts rate-limiting.
 */
export async function getLogsChunked(
  publicClient: PublicClient,
  params: Omit<Parameters<PublicClient['getLogs']>[0], 'fromBlock' | 'toBlock'>
) {
  const CONCURRENCY = 5;

  const latestBlock = await publicClient.getBlockNumber();
  const startBlock = latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : 0n;

  const ranges: Array<{ from: bigint; to: bigint }> = [];
  let chunkStart = startBlock;
  while (chunkStart <= latestBlock) {
    const chunkEnd =
      chunkStart + MAX_BLOCK_RANGE > latestBlock ? latestBlock : chunkStart + MAX_BLOCK_RANGE;
    ranges.push({ from: chunkStart, to: chunkEnd });
    chunkStart = chunkEnd + 1n;
  }

  const allLogs: Awaited<ReturnType<PublicClient['getLogs']>> = [];

  for (let i = 0; i < ranges.length; i += CONCURRENCY) {
    const batch = ranges.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(({ from, to }) =>
        publicClient.getLogs({
          ...params,
          fromBlock: from,
          toBlock: to,
        } as Parameters<PublicClient['getLogs']>[0])
      )
    );
    for (const logs of batchResults) {
      allLogs.push(...logs);
    }
  }

  return allLogs;
          }
