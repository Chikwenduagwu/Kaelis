/**
 * Known Nox/ERC-7984 custom error selectors, confirmed by computing keccak256
 * selectors against the real error signatures in @iexec-nox/nox-protocol-contracts
 * and @iexec-nox/nox-confidential-contracts source during development (see
 * ARCHITECTURE.md / feedback.md for the investigation that identified these).
 * Used to turn an opaque "unknown custom error" revert into an honest, specific
 * message instead of a generic "Error processing the transaction".
 */
const KNOWN_NOX_ERRORS: Record<string, string> = {
  '0xb87a12a9':
    'The confidential compute layer rejected access to an encrypted balance handle ' +
    '(NotAllowed). This is a known open issue with the Nox testnet integration -- ' +
    'see feedback.md for details. It is not caused by anything wrong with your claim.',
  '0xae385f38':
    'The encrypted proof for this transaction was invalid or expired (InvalidProof). ' +
    'Try refreshing and attempting the claim again.',
  '0x67cfe805':
    'This wallet is not authorized to use this encrypted amount ' +
    '(ERC7984UnauthorizedUseOfEncryptedAmount).',
  '0x5ff91cdc': 'This account has no confidential token balance yet (ERC7984ZeroBalance).',
};

/**
 * Attempts to extract a raw error-data selector from a viem/wagmi contract-call error
 * and match it against known Nox error selectors. Falls back to null if the error
 * doesn't carry recognizable revert data (e.g. wallet rejection, network error).
 */
export function decodeNoxError(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;

  // viem surfaces revert data in a few different shapes depending on the error
  // subclass and the underlying RPC provider's response format -- check the common
  // locations rather than assuming one specific structure.
  const err = error as {
    data?: unknown;
    cause?: { data?: unknown; cause?: { data?: unknown } };
    walk?: (fn: (e: unknown) => boolean) => { data?: unknown } | undefined;
  };

  const candidates: unknown[] = [
    err.data,
    err.cause?.data,
    err.cause?.cause?.data,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.startsWith('0x') && candidate.length >= 10) {
      const selector = candidate.slice(0, 10);
      if (KNOWN_NOX_ERRORS[selector]) {
        return KNOWN_NOX_ERRORS[selector];
      }
    }
  }

  return null;
}
