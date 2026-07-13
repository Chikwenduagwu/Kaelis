'use client';

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import type { Abi } from 'viem';
import { decodeNoxError } from './decodeNoxError';

export type TxStatus = 'idle' | 'signing' | 'pending' | 'success' | 'error';

/**
 * Wraps wagmi's writeContractAsync + waitForTransactionReceipt into a single call
 * with UX-friendly status transitions: 'signing' while the wallet prompt is open,
 * 'pending' once the tx is broadcast and we're waiting for a confirmation, 'success'
 * once mined. Distinguishes wallet rejection from on-chain revert in the error
 * message so the UI can show an accurate message for each (per the brief's explicit
 * UX requirements: wallet rejection, transaction pending, transaction success).
 */
export function useContractTransaction() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<TxStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const execute = useCallback(
    async (params: {
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
      args: readonly unknown[];
    }) => {
      setStatus('signing');
      setErrorMessage(null);
      setTxHash(null);
      try {
        const hash = await writeContractAsync(params);
        setTxHash(hash);
        setStatus('pending');
        let receipt = null;
        if (publicClient) {
          receipt = await publicClient.waitForTransactionReceipt({ hash });
        }
        setStatus('success');
        return { hash, receipt };
      } catch (error: any) {
        setStatus('error');
        const message: string = error?.shortMessage || error?.message || 'Transaction failed.';
        const noxMessage = decodeNoxError(error);
        if (noxMessage) {
          setErrorMessage(noxMessage);
        } else if (message.toLowerCase().includes('user rejected') || message.toLowerCase().includes('denied')) {
          setErrorMessage('You rejected the transaction in your wallet.');
        } else {
          setErrorMessage(message);
        }
        throw error;
      }
    },
    [writeContractAsync, publicClient]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
    setTxHash(null);
  }, []);

  return { execute, status, errorMessage, txHash, reset };
}
