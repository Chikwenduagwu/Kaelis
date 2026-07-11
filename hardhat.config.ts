import hardhatToolboxViemPlugin from '@nomicfoundation/hardhat-toolbox-viem';
import { defineConfig } from 'hardhat/config';
import noxPlugin from '@iexec-nox/nox-hardhat-plugin';
import 'dotenv/config';

const { SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY } = process.env;

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, noxPlugin],
  solidity: '0.8.35',
  networks: {
    default: {
      // Local Hardhat network. Not used for Nox testing in this project -- we deploy
      // and iterate directly against Sepolia (see `sepolia` network below) instead of
      // running the Docker-backed offchain Nox stack locally.
      type: 'edr-simulated',
      chainType: 'op',
    },
    sepolia: {
      type: 'http',
      chainType: 'l1',
      url: SEPOLIA_RPC_URL ?? '',
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  nox: {
    // We are not running `hardhat test` against the Docker-backed local Nox stack in
    // this project (see README/ARCHITECTURE for the tradeoff) -- all confidential
    // contract exercising happens via scripts/*.ts run directly against Sepolia, where
    // Nox's real Handle Gateway, KMS and Runner infrastructure is already live.
    skipTestOverride: true,
  },
});
