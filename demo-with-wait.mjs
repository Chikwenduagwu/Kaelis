import 'dotenv/config';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { createEthersHandleClient } from '@iexec-nox/handle';
import fs from 'node:fs';

const deployment = JSON.parse(fs.readFileSync('./deployments/sepolia.json', 'utf8'));
const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const distributor = new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
const recipient = new Wallet(process.env.RECIPIENT_PRIVATE_KEY, provider);

const tokenAbi = ['function mint(address to, bytes32 encryptedAmount, bytes calldata inputProof) external returns (bytes32)'];
const managerAbi = [
  'function createCampaign(uint8 campaignType, address token, uint64 startTime, uint64 cliffDuration, uint64 vestingDuration) external returns (uint256)',
  'function addRecipient(uint256 campaignId, address recipient, bytes32 encryptedAllocation, bytes calldata allocationProof) external',
  'function sealCampaign(uint256 campaignId) external',
  'function claim(uint256 campaignId) external',
  'event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint8 campaignType, address token, uint64 startTime, uint64 cliffDuration, uint64 vestingDuration)',
];

const token = new Contract(deployment.contracts.KaelisToken, tokenAbi, distributor);
const manager = new Contract(deployment.contracts.KaelisCampaignManager, managerAbi, distributor);

const distributorClient = await createEthersHandleClient(distributor);
const recipientClient = await createEthersHandleClient(recipient);

console.log('[1] Minting...');
const mintEnc = await distributorClient.encryptInput(10_000n, 'uint256', deployment.contracts.KaelisToken);
const mintTx = await token.mint(deployment.contracts.KaelisCampaignManager, mintEnc.handle, mintEnc.handleProof);
await mintTx.wait();
console.log('Mint confirmed:', mintTx.hash);

console.log('[2] Waiting 60s for off-chain Nox compute to fully settle...');
await new Promise((r) => setTimeout(r, 60_000));

console.log('[3] Creating campaign...');
const now = Math.floor(Date.now() / 1000);
const createTx = await manager.createCampaign(0, deployment.contracts.KaelisToken, now, 0, 0);
const createReceipt = await createTx.wait();
const event = createReceipt.logs.map(l => { try { return manager.interface.parseLog(l); } catch { return null; } }).find(e => e?.name === 'CampaignCreated');
const campaignId = event.args.campaignId;
console.log('Campaign id:', campaignId.toString());

console.log('[4] Adding recipient...');
const allocEnc = await distributorClient.encryptInput(2_500n, 'uint256', deployment.contracts.KaelisCampaignManager);
const addTx = await manager.addRecipient(campaignId, recipient.address, allocEnc.handle, allocEnc.handleProof);
await addTx.wait();
console.log('Recipient added:', addTx.hash);

console.log('[5] Sealing...');
const sealTx = await manager.sealCampaign(campaignId);
await sealTx.wait();
console.log('Sealed:', sealTx.hash);

console.log('[6] Waiting another 30s before claim...');
await new Promise((r) => setTimeout(r, 30_000));

console.log('[7] Claiming...');
const managerAsRecipient = manager.connect(recipient);
try {
  const claimTx = await managerAsRecipient.claim(campaignId);
  await claimTx.wait();
  console.log('CLAIM SUCCESS:', claimTx.hash);
} catch (err) {
  console.log('CLAIM FAILED:', err.shortMessage || err.message);
  console.log('Error data:', err.data || err.info?.error?.data);
}
