import 'dotenv/config';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { createEthersHandleClient } from '@iexec-nox/handle';
import fs from 'node:fs';

const deployment = JSON.parse(fs.readFileSync('./deployments/sepolia.json', 'utf8'));
const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const distributor = new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

const tokenAbi = ['function mint(address to, bytes32 encryptedAmount, bytes calldata inputProof) external returns (bytes32)'];
const token = new Contract(deployment.contracts.KaelisToken, tokenAbi, distributor);

console.log('Distributor address:', distributor.address);
console.log('Token address:', deployment.contracts.KaelisToken);
console.log('Manager address:', deployment.contracts.KaelisCampaignManager);

const handleClient = await createEthersHandleClient(distributor);

console.log('Encrypting...');
const encrypted = await handleClient.encryptInput(10_000n, 'uint256', deployment.contracts.KaelisToken);
console.log('Handle:', encrypted.handle);
console.log('Proof (first 80 chars):', encrypted.handleProof.slice(0, 80));

try {
  const tx = await token.mint(deployment.contracts.KaelisCampaignManager, encrypted.handle, encrypted.handleProof);
  console.log('SUCCESS, tx:', tx.hash);
} catch (err) {
  console.log('FULL ERROR DATA:', err.data);
  console.log('INFO ERROR DATA:', err.info?.error?.data);
  console.log('SHORT MESSAGE:', err.shortMessage);
}
