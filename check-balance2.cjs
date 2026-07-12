require('dotenv').config();
const { ethers } = require('ethers');
const deployment = require('./deployments/sepolia.json');

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const tokenAbi = ['function confidentialBalanceOf(address account) external view returns (bytes32)'];
  const token = new ethers.Contract(deployment.contracts.KaelisToken, tokenAbi, provider);

  const balanceHandle = await token.confidentialBalanceOf(deployment.contracts.KaelisCampaignManager);
  console.log('Balance handle:', balanceHandle);
  console.log('Is zero handle:', balanceHandle === '0x0000000000000000000000000000000000000000000000000000000000000000'.slice(0, 66));
  console.log('Is all zeros:', /^0x0+$/.test(balanceHandle));
}
main();
