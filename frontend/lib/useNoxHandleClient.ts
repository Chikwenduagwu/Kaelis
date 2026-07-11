'use client';

import { useMemo } from 'react';
import { useWalletClient } from 'wagmi';
import { createViemHandleClient } from '@iexec-nox/handle';
import type { HandleClient } from '@iexec-nox/handle';

/**
 * Wraps @iexec-nox/handle's createViemHandleClient with the connected wagmi wallet
 * client. Returns a promise-producing getter rather than a resolved client because
 * createViemHandleClient is itself async (it detects chainId and resolves gateway
 * config -- see NETWORK_CONFIGS in the SDK source, which has real Ethereum Sepolia
 * (11155111) defaults baked in).
 *
 * Usage:
 *   const { getHandleClient } = useNoxHandleClient();
 *   const client = await getHandleClient();
 *   const { handle, handleProof } = await client.encryptInput(2500n, 'uint256', managerAddress);
 */
export function useNoxHandleClient() {
  const { data: walletClient } = useWalletClient();

  const getHandleClient = useMemo(() => {
    return async (): Promise<HandleClient> => {
      if (!walletClient) {
        throw new Error('Wallet not connected -- connect a wallet before encrypting or decrypting.');
      }
      // createViemHandleClient auto-detects chainId from the connected wallet client
      // and resolves gateway/subgraph config from the SDK's built-in Sepolia defaults.
      return createViemHandleClient(walletClient);
    };
  }, [walletClient]);

  return { getHandleClient, isReady: Boolean(walletClient) };
}

/**
 * Nox protocol only supports these Solidity types for encryptInput today (confirmed
 * against @iexec-nox/handle@0.1.0-beta.13 source: NOX_SUPPORTED_TYPES in
 * methods/encryptInput.ts). All Kaelis contracts use euint256, so 'uint256' is the
 * only type this app needs.
 */
export const NOX_ENCRYPTABLE_TYPE = 'uint256' as const;
