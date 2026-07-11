import 'dotenv/config';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { createEthersHandleClient } from '@iexec-nox/handle';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Exercises the full confidential campaign flow against Sepolia:
 *
 *   1. Distributor encrypts a mint amount, mints KaelisToken to the campaign manager
 *      (funding the pool the campaign will pay out from).
 *   2. Distributor creates an Airdrop campaign.
 *   3. Distributor encrypts a recipient's allocation and calls addRecipient().
 *   4. Distributor seals the campaign.
 *   5. Recipient calls claim() -- KaelisCampaignManager computes the vested/claimable
 *      amount over encrypted handles and moves it via KaelisToken.confidentialTransfer.
 *   6. Recipient decrypts their own claimed-amount handle via the JS SDK to confirm
 *      the confidential compute pipeline actually ran.
 *
 * Run with: npx hardhat run scripts/demo-flow.ts --network sepolia
 * (plain Node + ethers is used here rather than hardhat's viem helpers, since the
 * Nox JS SDK's createEthersHandleClient expects an ethers signer.)
 *
 * Requires in .env: SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY (distributor),
 * RECIPIENT_PRIVATE_KEY (a second funded Sepolia wallet acting as claimer).
 */

const KAELIS_TOKEN_ABI = [
  'function mint(address to, bytes32 encryptedAmount, bytes calldata inputProof) external returns (bytes32)',
  'function confidentialBalanceOf(address account) external view returns (bytes32)',
];

const CAMPAIGN_MANAGER_ABI = [
  'function createCampaign(uint8 campaignType, address token, uint64 startTime, uint64 cliffDuration, uint64 vestingDuration) external returns (uint256)',
  'function addRecipient(uint256 campaignId, address recipient, bytes32 encryptedAllocation, bytes calldata allocationProof) external',
  'function sealCampaign(uint256 campaignId) external',
  'function claim(uint256 campaignId) external',
  'function getClaimedHandle(uint256 campaignId, address recipient) external view returns (bytes32)',
  'function getAllocationHandle(uint256 campaignId, address recipient) external view returns (bytes32)',
  'event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint8 campaignType, address token, uint64 startTime, uint64 cliffDuration, uint64 vestingDuration)',
];

async function main() {
  const { SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, RECIPIENT_PRIVATE_KEY } = process.env;
  if (!SEPOLIA_RPC_URL || !DEPLOYER_PRIVATE_KEY || !RECIPIENT_PRIVATE_KEY) {
    throw new Error(
      'Missing env vars. Required: SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, RECIPIENT_PRIVATE_KEY'
    );
  }

  const deploymentPath = path.join(process.cwd(), 'deployments', 'sepolia.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const tokenAddress: string = deployment.contracts.KaelisToken;
  const managerAddress: string = deployment.contracts.KaelisCampaignManager;

  const provider = new JsonRpcProvider(SEPOLIA_RPC_URL);
  const distributor = new Wallet(DEPLOYER_PRIVATE_KEY, provider);
  const recipient = new Wallet(RECIPIENT_PRIVATE_KEY, provider);

  console.log('Distributor:', distributor.address);
  console.log('Recipient:  ', recipient.address);

  const distributorHandleClient = await createEthersHandleClient(distributor);
  const recipientHandleClient = await createEthersHandleClient(recipient);

  const token = new Contract(tokenAddress, KAELIS_TOKEN_ABI, distributor);
  const manager = new Contract(managerAddress, CAMPAIGN_MANAGER_ABI, distributor);

  // ---- 1. Fund the campaign manager's token pool ----
  const FUND_AMOUNT = 10_000n; // plaintext only exists locally + inside the TEE, never on-chain
  console.log('\n[1/6] Encrypting mint amount...');
  const mintEncrypted = await distributorHandleClient.encryptInput(
    FUND_AMOUNT,
    'uint256',
    tokenAddress // applicationContract = the token contract that will call Nox.fromExternal
  );

  console.log('Minting to campaign manager pool...');
  const mintTx = await token.mint(managerAddress, mintEncrypted.handle, mintEncrypted.handleProof);
  await mintTx.wait();
  console.log('Mint tx:', mintTx.hash);

  // ---- 2. Create an Airdrop campaign (immediate unlock, no vesting schedule) ----
  console.log('\n[2/6] Creating campaign...');
  const now = Math.floor(Date.now() / 1000);
  const createTx = await manager.createCampaign(
    0, // CampaignType.Airdrop
    tokenAddress,
    now, // startTime = now, so it's immediately unlocked
    0, // cliffDuration
    0 // vestingDuration
  );
  const createReceipt = await createTx.wait();
  const createdEvent = createReceipt.logs
    .map((log: any) => {
      try {
        return manager.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed: any) => parsed?.name === 'CampaignCreated');
  const campaignId: bigint = createdEvent!.args.campaignId;
  console.log('Campaign created, id:', campaignId.toString(), 'tx:', createTx.hash);

  // ---- 3. Add the recipient with an encrypted allocation ----
  const ALLOCATION_AMOUNT = 2_500n;
  console.log('\n[3/6] Encrypting recipient allocation...');
  const allocationEncrypted = await distributorHandleClient.encryptInput(
    ALLOCATION_AMOUNT,
    'uint256',
    managerAddress // applicationContract = KaelisCampaignManager, which calls Nox.fromExternal
  );

  console.log('Adding recipient...');
  const addRecipientTx = await manager.addRecipient(
    campaignId,
    recipient.address,
    allocationEncrypted.handle,
    allocationEncrypted.handleProof
  );
  await addRecipientTx.wait();
  console.log('Recipient added, tx:', addRecipientTx.hash);

  // ---- 4. Seal the campaign ----
  console.log('\n[4/6] Sealing campaign...');
  const sealTx = await manager.sealCampaign(campaignId);
  await sealTx.wait();
  console.log('Campaign sealed, tx:', sealTx.hash);

  // ---- 5. Recipient claims ----
  console.log('\n[5/6] Recipient claiming...');
  const managerAsRecipient = manager.connect(recipient) as Contract;
  const claimTx = await managerAsRecipient.claim(campaignId);
  await claimTx.wait();
  console.log('Claim tx:', claimTx.hash);

  // ---- 6. Recipient decrypts their claimed-amount handle to verify ----
  console.log('\n[6/6] Decrypting claimed amount (recipient-side, may retry while');
  console.log('       the off-chain Nox Runner finishes computing the handle)...');
  const claimedHandle = await manager.getClaimedHandle(campaignId, recipient.address);
  const decrypted = await recipientHandleClient.decrypt(claimedHandle as `0x${string}`);
  console.log('\nDecrypted claimed amount:', decrypted.value.toString());
  console.log(
    decrypted.value === ALLOCATION_AMOUNT
      ? '✅ Matches the full allocation -- confidential claim succeeded end-to-end.'
      : '⚠️  Value differs from expected allocation -- check vesting schedule / pool funding.'
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
