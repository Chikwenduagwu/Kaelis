'use client';

import { useCallback, useState } from 'react';
import { useNoxHandleClient } from './useNoxHandleClient';

type DecryptState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'error'; message: string }
  | { status: 'success'; value: bigint };

/**
 * Decrypts a single euint256 handle for the connected wallet.
 *
 * The underlying SDK method (handleClient.decrypt) requires an EIP-712 signature and
 * internally retries with backoff if the handle's ciphertext hasn't been produced yet
 * by the off-chain Nox Runner (NotYetComputedHandleError -- confirmed in SDK source).
 * That means a claim/allocation amount is NOT decryptable the instant a transaction
 * confirms; there is a real async compute step in between. This hook surfaces that as
 * a genuine 'pending' state rather than hiding the latency behind a spinner that
 * implies near-instant resolution.
 */
export function useDecryptHandle() {
  const { getHandleClient } = useNoxHandleClient();
  const [state, setState] = useState<DecryptState>({ status: 'idle' });

  const decryptHandle = useCallback(
    async (handle: `0x${string}`) => {
      setState({ status: 'pending' });
      try {
        const client = await getHandleClient();
        const { value } = await client.decrypt(handle);
        setState({ status: 'success', value: value as bigint });
        return value as bigint;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to decrypt this value.';
        setState({ status: 'error', message });
        throw error;
      }
    },
    [getHandleClient]
  );

  return { decryptHandle, state };
}
