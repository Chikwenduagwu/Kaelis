<div align="center">

# Kaelis

**Confidential Token Operations, powered by iExec Nox**

[![Network](https://img.shields.io/badge/network-Ethereum%20Sepolia-627EEA?style=flat-square)](https://sepolia.etherscan.io)
[![Built with Nox](https://img.shields.io/badge/built%20with-iExec%20Nox-B08D3F?style=flat-square)](https://docs.iex.ec/nox-protocol/getting-started/welcome)
[![License](https://img.shields.io/badge/license-MIT-333333?style=flat-square)](./LICENSE)

Privacy-first token distributions, vesting, payroll, and grants — where recipient
allocations stay encrypted end-to-end, but every operation remains verifiable
on-chain.

[Live app](https://kaelis-phi.vercel.app) · [Documentation](https://kaelis-phi.vercel.app/docs) · [Architecture](./ARCHITECTURE.md) · [Feedback](./feedback.md)

</div>

---

## What is Kaelis?

Traditional distribution platforms put every recipient's exact allocation on-chain
in plaintext — anyone can query a contract and see precisely how much every investor,
contributor, or employee was paid. Kaelis uses **iExec Nox confidential computing**
so those amounts stay encrypted throughout their entire lifecycle — funding,
allocation, vesting, and claim — while the platform remains fully auditable:
recipients can prove their own entitlement, auditors can be granted selective view
access, and everyone else sees only that a transaction happened, never the amount.

**Deployed and verified on Ethereum Sepolia.** No mock data anywhere — every number
shown in the app comes from live reads against the deployed contracts.

## Features

- **Confidential distributions** — Airdrops, Vesting (linear + cliff), Payroll
  (recurring unlock), and Grants (milestone-gated), all using the same encrypted
  allocation/claim engine.
- **Real ERC-7984 confidential token** — `KaelisToken` (kUSD), extending iExec's
  official reference implementation.
- **Faucet** — claim test kUSD directly from the app to try creating a distribution.
- **Confidential claims** — recipients see only the campaigns they're actually
  eligible for, with per-campaign claim status decrypted client-side.
- **No `eth_getLogs` dependency** — dashboard and list views read contract state
  directly (`campaignCount()` / `getCampaign()`), sidestepping the wildly
  inconsistent block-range limits different RPC providers impose on log scans.

## Project structure

```
contracts/
  KaelisCampaignManager.sol   Confidential distributions/vesting/payroll/grants
  KaelisToken.sol             Native ERC-7984 confidential token (mint/burn/transfer)
scripts/
  deploy.ts                   Deploys both contracts to Sepolia
  demo-flow.ts                 End-to-end confidential flow: mint -> create campaign ->
                               add recipient -> seal -> claim -> decrypt
frontend/
  app/                        Next.js 15 app router
    page.tsx                  Landing page (photo hero, terminal, FAQ)
    app/                      The dashboard application (post "Launch App")
      distributions/          Create + list distributions (all types)
      vesting/, payroll/, grants/   Type-filtered views of the same data
      claims/                 Eligibility-scanned claim flow
      faucet/                 Test-token faucet
    api/faucet/                Server-side faucet mint endpoint
  lib/                        wagmi config, Nox SDK hooks, contract ABIs/addresses
ARCHITECTURE.md               Design rationale and Nox integration details
feedback.md                   Developer experience feedback for the iExec Nox team
```

## Prerequisites

- Node.js 20+
- A Sepolia RPC URL (Alchemy or Infura — Alchemy's free tier is used throughout this
  guide)
- Two funded Sepolia wallets: one distributor/deployer, one recipient/claimer (for
  the demo script)
- An injected browser wallet (MetaMask, Rabby, etc.) — Kaelis is injected-wallet-only,
  no WalletConnect

## Installation

```bash
# Clone and install root (contracts) dependencies
git clone https://github.com/Chikwenduagwu/Kaelis.git
cd Kaelis
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

## Configuration

**Root `.env`** (contracts, scripts):

```bash
cp .env.example .env
```

```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=0xyour_deployer_key
RECIPIENT_PRIVATE_KEY=0xyour_recipient_key
```

**Frontend `.env.local`** (`frontend/.env.local`):

```bash
cd frontend && cp .env.local.example .env.local
```

```
NEXT_PUBLIC_KAELIS_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Server-only -- no NEXT_PUBLIC_ prefix, used by the faucet API route only
DEPLOYER_PRIVATE_KEY=0xyour_deployer_key
```

## Deploying the contracts

```bash
npx hardhat compile
npm run deploy:sepolia
```

This deploys `KaelisToken` and `KaelisCampaignManager`, writing their addresses to
`deployments/sepolia.json`. Copy both addresses into `frontend/.env.local` (and into
Vercel's environment variables if deploying the frontend).

## Verifying the deployment end-to-end

```bash
npm run demo:sepolia
```

Mints tokens, creates a campaign, adds a recipient, seals it, claims, and decrypts the
result — proving the full confidential pipeline actually works before you touch the
UI.

## Running the frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000`. Connect an injected wallet on Sepolia, claim test
tokens from the Faucet page, then create a distribution or check your claims.

### Deploying the frontend (Vercel)

1. Import the repo into Vercel
2. Set **Root Directory** to `frontend`
3. Add the environment variables listed above under Project Settings → Environment
   Variables (mark `DEPLOYER_PRIVATE_KEY` as a regular, non-public variable)
4. Deploy

## A note on local Nox testing

This project does not run the Docker-backed local Nox offchain stack
(`nox-hardhat-plugin`'s local Handle Gateway + KMS simulator). All confidential
contract exercising happens directly against Sepolia, where Nox's real
infrastructure is already live — `hardhat.config.ts` sets `nox.skipTestOverride: true`
to make this explicit. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full
reasoning.

## Documentation

- [Architecture & Nox integration details](./ARCHITECTURE.md)
- [In-app documentation](https://kaelis-phi.vercel.app/docs)
- [Developer feedback for the Nox team](./feedback.md)

## License

MIT — see [LICENSE](./LICENSE).
