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

// Lowered from 5 -> 3 after seeing "Failed to fetch" network-level errors, which
// suggest thirdweb's free public RPC was rejecting/dropping requests under the
// previous concurrency level rather than returning a clean rate-limit error.
const CONCURRENCY = 3;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs a single getLogs call with retry-with-backoff. Free public RPC endpoints can
 * transiently fail (dropped connection, momentary rate limit) even for a request
 * that's well within their documented limits -- retrying a couple of times with a
 * short, increasing delay is the standard defensive pattern for this, and is much
 * cheaper than the alternative of just failing the whole dashboard load on one blip.
 */
async function getLogsWithRetry(
  publicClient: PublicClient,
  args: Parameters<PublicClient['getLogs']>[0]
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await publicClient.getLogs(args);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }
  throw lastError;
}

/**
 * Fetches logs for a single event across a wide block range by splitting the query
 * into chunks that stay under the RPC provider's per-call block-range limit, then
 * concatenating the results. Chunks are fetched with limited concurrency (a few at a
 * time) rather than one-by-one -- a 1,000-block cap over a 50,000-block window means
 * 50 chunks, and running those fully sequentially would be slow enough to visibly
 * delay the dashboard -- while each individual call retries on transient failure.
 */
export async function getLogsChunked(
  publicClient: PublicClient,
  params: Omit<Parameters<PublicClient['getLogs']>[0], 'fromBlock' | 'toBlock'>
) {
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
        getLogsWithRetry(publicClient, {
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
