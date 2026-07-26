'use client';

import { useCallback, useState } from 'react';

export type PassportCheckState = 'idle' | 'checking' | 'passed' | 'failed' | 'error';

/**
 * Manual Passport score check -- deliberately NOT a useEffect that fires on mount.
 * The connected wallet's score doesn't change per campaign, so this is a single
 * shared check triggered by whichever row's "Check Human Status" button the user
 * clicks first; once it resolves, every row reads the same state instead of
 * re-checking.
 */
export function usePassportScore(address: `0x${string}` | undefined) {
  const [state, setState] = useState<PassportCheckState>('idle');
  const [score, setScore] = useState<number | null>(null);
  const [threshold, setThreshold] = useState<number>(20);

  const check = useCallback(async () => {
    if (!address || state === 'checking' || state === 'passed') return;
    setState('checking');
    try {
      const res = await fetch(`/api/passport/score?address=${address}`);
      const data = await res.json();
      if (data.error) {
        setState('error');
        return;
      }
      setScore(data.score);
      setThreshold(data.threshold);
      setState(data.passingScore ? 'passed' : 'failed');
    } catch {
      setState('error');
    }
  }, [address, state]);

  return { state, score, threshold, check };
}
