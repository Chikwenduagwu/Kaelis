const PASSPORT_API_BASE = 'https://api.passport.xyz/v2/stamps';

// Simple in-memory cache. Vercel serverless functions are stateless per-invocation,
// so this only helps within a warm instance -- it reduces but doesn't eliminate
// upstream calls. Swap for KV/Redis if you add persistent storage later.
const cache = new Map<string, { data: PassportResult; expiresAt: number }>();
const TTL_MS = 30 * 60 * 1000;

export type PassportResult = {
  address: string;
  score: number;
  threshold: number;
  passingScore: boolean;
};

export async function getPassportScore(address: string): Promise<PassportResult> {
  const normalized = address.toLowerCase();

  const cached = cache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const { PASSPORT_API_KEY, PASSPORT_SCORER_ID } = process.env;
  if (!PASSPORT_API_KEY || !PASSPORT_SCORER_ID) {
    throw new Error('Passport is not configured on the server.');
  }

  const res = await fetch(`${PASSPORT_API_BASE}/${PASSPORT_SCORER_ID}/score/${normalized}`, {
    headers: { 'X-API-KEY': PASSPORT_API_KEY },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Passport lookup failed: ${detail}`);
  }

  const data = await res.json();
  const result: PassportResult = {
    address: normalized,
    score: Number(data.score ?? 0),
    threshold: Number(data.threshold ?? 20),
    passingScore: Boolean(data.passing_score),
  };

  cache.set(normalized, { data: result, expiresAt: Date.now() + TTL_MS });
  return result;
}
