import { network } from 'hardhat';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Deploys KaelisToken (confidential ERC-7984) and KaelisCampaignManager to Sepolia.
 *
 * Run with: npx hardhat run scripts/deploy.ts --network sepolia
 *
 * Requires SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in .env (see .env.example).
 */
async function main() {
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const deployerAddress = deployer.account.address;

  console.log('Deploying from:', deployerAddress);

  const kaelisToken = await viem.deployContract('KaelisToken', [
    'Kaelis Confidential Token',
    'kUSD',
    'https://kaelis.app/token-metadata',
    deployerAddress,
  ]);
  console.log('KaelisToken deployed at:', kaelisToken.address);

  const campaignManager = await viem.deployContract('KaelisCampaignManager', []);
  console.log('KaelisCampaignManager deployed at:', campaignManager.address);

  const deploymentInfo = {
    network: 'sepolia',
    chainId: 11155111,
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
    contracts: {
      KaelisToken: kaelisToken.address,
      KaelisCampaignManager: campaignManager.address,
    },
    // Confirmed from @iexec-nox/nox-protocol-contracts@0.2.4 source (contracts/sdk/Nox.sol)
    noxComputeAddress: '0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF',
  };

  const outDir = path.join(process.cwd(), 'deployments');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'sepolia.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('\nDeployment info written to deployments/sepolia.json');
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
