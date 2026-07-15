import KaelisCampaignManagerAbi from './abi/KaelisCampaignManager.json';
import KaelisTokenAbi from './abi/KaelisToken.json';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

/**
 * Reads a contract address from a NEXT_PUBLIC_* env var. These are inlined into the
 * client bundle at build time by Next.js -- set them in Vercel's Project Settings ->
 * Environment Variables (or in a local, gitignored .env.local for local dev), not in
 * a committed file, since NEXT_PUBLIC_* vars ship to the browser (they're addresses,
 * not secrets, so that's fine -- private keys must never use this prefix).
 *
 * Falls back to the zero address (treated by the app as "not yet deployed" --
 * see useDashboardStats.ts / useRecentCampaigns.ts's isDeployed checks) rather than
 * throwing, so local dev without a .env.local still boots to a working empty state
 * instead of a hard crash.
 */
function readContractAddress(envVarName: string, envValue: string | undefined): `0x${string}` {
  if (!envValue) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[kaelis] ${envVarName} is not set -- falling back to the zero address. ` +
          `Set it in frontend/.env.local (see .env.local.example) to point the app at your deployed contracts.`
      );
    }
    return ZERO_ADDRESS;
  }
  if (!ADDRESS_PATTERN.test(envValue)) {
    throw new Error(`[kaelis] ${envVarName} is set but is not a valid Ethereum address: "${envValue}"`);
  }
  return envValue as `0x${string}`;
}

export const CONTRACTS = {
  KaelisToken: readContractAddress(
    'NEXT_PUBLIC_KAELIS_TOKEN_ADDRESS',
    process.env.NEXT_PUBLIC_KAELIS_TOKEN_ADDRESS
  ),
  KaelisCampaignManager: readContractAddress(
    'NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS',
    process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS
  ),
} as const;

export const SEPOLIA_CHAIN_ID = 11155111;

// Confirmed from @iexec-nox/nox-protocol-contracts@0.2.4 (contracts/sdk/Nox.sol) --
// the deployed NoxCompute protocol contract on Ethereum Sepolia.
export const NOX_COMPUTE_ADDRESS_SEPOLIA = '0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF';

export const KaelisCampaignManagerABI = KaelisCampaignManagerAbi;
export const KaelisTokenABI = KaelisTokenAbi;

/**
 * Registry of confidential (ERC-7984) tokens the distribution wizard's token
 * selector offers. Deliberately KaelisToken-only for now -- distributing real assets
 * like USDT/USDC confidentially would need an ERC20-to-ERC7984 wrapper contract
 * deployed per underlying token first (Nox ships a reference wrapper,
 * ERC20ToERC7984Wrapper, but none is deployed yet for this project). Adding a second
 * token later is just adding another entry here; the selector component itself
 * doesn't need to change.
 */
export interface SupportedToken {
  address: `0x${string}`;
  symbol: string;
  name: string;
}

export const SUPPORTED_TOKENS: SupportedToken[] = [
  {
    address: CONTRACTS.KaelisToken,
    symbol: 'kUSD',
    name: 'Kaelis Confidential Token',
  },
];

export const CAMPAIGN_TYPE = {
  Airdrop: 0,
  Vesting: 1,
  Payroll: 2,
  Grant: 3,
} as const;

export const CAMPAIGN_TYPE_LABELS: Record<number, string> = {
  0: 'Airdrop',
  1: 'Vesting',
  2: 'Payroll',
  3: 'Grant',
};

export const CAMPAIGN_STATUS_LABELS: Record<number, string> = {
  0: 'Active',
  1: 'Paused',
  2: 'Completed',
};
