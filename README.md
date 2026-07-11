# Kaelis — Confidential Token Operations

Kaelis is a confidential token distribution platform built on **iExec Nox**. Recipient
allocations, vesting schedules, payroll amounts, and grant sizes are encrypted
end-to-end using Nox's Trusted Execution Environment (TEE) infrastructure — the
platform tracks *who* received something and *that a transaction happened*, but never
*how much*, unless the recipient (or someone they've explicitly granted view access
to) chooses to decrypt it.

Built for the iExec Nox hackathon. Deployed on **Ethereum Sepolia**.

## Why this matters

Traditional on-chain distribution platforms leak everything: every wallet's exact
allocation, every vesting cliff, every payroll amount, sitting in plaintext for
anyone to query. That's a non-starter for real payroll, real investor allocations, or
real grants. Kaelis keeps the amounts confidential while keeping the process fully
verifiable on-chain — recipients can prove their own entitlement, auditors can be
granted selective view access, and nobody else sees anything.

## What's real here (and what's explicitly scaffolded)

Per the hackathon rules, **there is no mock data anywhere in this repository.** Every
number displayed in the dashboard comes from live `getLogs`/`readContract` calls
against the deployed contracts. Every "confidential" value is a genuine encrypted
`euint256` handle managed by Nox's off-chain Handle Gateway and TEE Runner — not a
locally-encrypted JSON blob pretending to be private.

What's explicitly marked as future work rather than faked:

- **Milestone-gated Grant unlocks** use a plaintext milestone counter (see
  `completeMilestone` in `KaelisCampaignManager.sol`) — milestone *completion* isn't
  sensitive information, so this is a deliberate simplification, not a placeholder.
- The frontend's "Vesting", "Payroll", and "Grants" sidebar links reuse the
  Distributions flow with a different `CampaignType` — see `ARCHITECTURE.md` for why
  these share one contract rather than four parallel ones.

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
    page.tsx                  Landing page (pinned scroll hero -> AI terminal)
    app/                      The dashboard application (post "Launch App")
  lib/                        wagmi config, Nox SDK hooks, contract ABIs/addresses
ARCHITECTURE.md               Design rationale and Nox integration details
feedback.md                   Developer experience feedback for the iExec Nox team
```

## Prerequisites

- Node.js 20+
- A Sepolia RPC URL (Alchemy, Infura, or similar)
- Two funded Sepolia wallets: one acting as the distributor/deployer, one as a
  recipient/claimer (for running the demo script)
- An injected browser wallet (MetaMask, Rabby, etc.) for using the frontend — Kaelis
  deliberately does not support WalletConnect

## Setup

```bash
# Install root (contracts) dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Configure environment
cp .env.example .env
# edit .env with your SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, RECIPIENT_PRIVATE_KEY
```

## Deploying to Sepolia

```bash
npm run deploy:sepolia
```

This deploys `KaelisToken` and `KaelisCampaignManager`, writing their addresses to
`deployments/sepolia.json`. Copy those addresses into
`frontend/lib/contracts.ts` (`CONTRACTS.KaelisToken` /
`CONTRACTS.KaelisCampaignManager`) so the frontend points at your deployment.

## Running the end-to-end demo (no frontend)

```bash
npm run demo:sepolia
```

This exercises the full confidential flow directly against Sepolia using the real
`@iexec-nox/handle` SDK: encrypts a mint amount, funds the campaign manager's token
pool, creates an Airdrop campaign, encrypts and adds a recipient allocation, seals the
campaign, claims as the recipient, and decrypts the recipient's own claimed-amount
handle to prove the confidential compute pipeline actually ran end-to-end.

## Running the frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000`. Connect an injected wallet on Sepolia, click **Launch
App**, and use the Distributions / Claims flows against your deployed contracts.

## A note on local testing

This project does **not** run the Docker-backed local Nox offchain stack (Handle
Gateway + KMS simulator via the `nox-hardhat-plugin`). Given the development
environment constraints, all confidential-contract exercising happens directly
against Sepolia, where Nox's real infrastructure is already live. `hardhat.config.ts`
sets `nox.skipTestOverride: true` to reflect this choice explicitly rather than
silently failing to boot Docker. See `ARCHITECTURE.md` for the tradeoff.

## License

MIT — see `LICENSE`.
