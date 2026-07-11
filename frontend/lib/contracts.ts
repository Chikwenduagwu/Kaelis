import KaelisCampaignManagerAbi from './abi/KaelisCampaignManager.json';
import KaelisTokenAbi from './abi/KaelisToken.json';

/**
 * Deployed Sepolia addresses. Populated from deployments/sepolia.json after running
 * `npm run deploy:sepolia` from the project root -- update these once real addresses
 * exist. Left as placeholders pre-deployment; the app should treat a zero address as
 * "not yet deployed" and show an empty state rather than attempting reads against it.
 */
export const CONTRACTS = {
  // TODO: replace after `npm run deploy:sepolia` -- copy from deployments/sepolia.json
  KaelisToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  KaelisCampaignManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,
} as const;

export const SEPOLIA_CHAIN_ID = 11155111;

// Confirmed from @iexec-nox/nox-protocol-contracts@0.2.4 (contracts/sdk/Nox.sol) --
// the deployed NoxCompute protocol contract on Ethereum Sepolia.
export const NOX_COMPUTE_ADDRESS_SEPOLIA = '0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF';

export const KaelisCampaignManagerABI = KaelisCampaignManagerAbi;
export const KaelisTokenABI = KaelisTokenAbi;

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
