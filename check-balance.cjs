require('dotenv').config();
const { ethers } = require('ethers');
const { createEthersHandleClient } = require('@iexec-nox/handle');
const deployment = require('./deployments/sepolia.json');

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const distributor = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  const tokenAbi = ['function confidentialBalanceOf(address account) external view returns (bytes32)'];
  const token = new ethers.Contract(deployment.contracts.KaelisToken, tokenAbi, distributor);

  const balanceHandle = await token.confidentialBalanceOf(deployment.contracts.KaelisCampaignManager);
  console.log('Campaign manager balance handle:', balanceHandle);

  const handleClient = await createEthersHandleClient(distributor);
  try {
    const decrypted = await handleClient.decrypt(balanceHandle);
    console.log('DECRYPTED BALANCE:', decrypted.value.toString());
  } catch (err) {
    console.log('Decrypt failed:', err.message);
  }
}
main();
