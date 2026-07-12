import 'dotenv/config';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { createEthersHandleClient } from '@iexec-nox/handle';
import fs from 'node:fs';

const deployment = JSON.parse(fs.readFileSync('./deployments/sepolia.json', 'utf8'));
const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const distributor = new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
const recipient = new Wallet(process.env.RECIPIENT_PRIVATE_KEY, provider);

const tokenAbi = ['function mint(address to, bytes32 encryptedAmount, bytes calldata inputProof) external returns (bytes32)'];
const token = new Contract(deployment.contracts.KaelisToken, tokenAbi, distributor);

console.log('Creating BOTH handle clients up front (like demo-flow.ts)...');
const distributorHandleClient = await createEthersHandleClient(distributor);
const recipientHandleClient = await createEthersHandleClient(recipient);

console.log('Encrypting...');
const encrypted = await distributorHandleClient.encryptInput(10_000n, 'uint256', deployment.contracts.KaelisToken);
console.log('Handle:', encrypted.handle);

try {
  const tx = await token.mint(deployment.contracts.KaelisCampaignManager, encrypted.handle, encrypted.handleProof);
  await tx.wait();
  console.log('SUCCESS, tx:', tx.hash);
} catch (err) {
  console.log('FAILED. FULL ERROR DATA:', err.data);
  console.log('SHORT MESSAGE:', err.shortMessage);
}
