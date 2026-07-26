'use client';

import { useEffect, useState } from 'react';

export type PassportCheckState = 'idle' | 'checking' | 'passed' | 'failed' | 'error';

export function usePassportScore(address: `0x${string}` | undefined) {
  const [state, setState] = useState<PassportCheckState>('idle');
  const [score, setScore] = useState<number | null>(null);
  const [threshold, setThreshold] = useState<number>(20);

  useEffect(() => {
    if (!address) {
      setState('idle');
      return;
    }

    let cancelled = false;
    setState('checking');

    fetch(`/api/passport/score?address=${address}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setState('error');
          return;
        }
        setScore(data.score);
        setThreshold(data.threshold);
        setState(data.passingScore ? 'passed' : 'failed');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { state, score, threshold };
}
