# Architecture

## Overview

Kaelis consists of four core components:

1. **`KaelisCampaignManager.sol`**
   The confidential distribution engine responsible for creating and managing Airdrop, Vesting, Payroll, and Grant campaigns. It stores recipients together with encrypted allocation and claimed-amount handles while enforcing campaign rules.

2. **`KaelisToken.sol`**
   A native ERC-7984 confidential token extending the official `@iexec-nox/nox-confidential-contracts` `ERC7984` reference implementation. Campaigns are funded by minting or transferring `KaelisToken` into the campaign manager's balance, allowing recipients to claim confidential allocations directly from the pooled funds.

3. **Human Passport**
   Human Passport provides Sybil resistance by verifying that recipients are unique humans before they can participate in distributions. Campaign creators can optionally require Human Passport verification, ensuring confidential rewards reach genuine participants instead of duplicate wallets.

4. **Next.js Frontend**
   Built with Next.js, wagmi, and viem for wallet connectivity and contract interactions, `@iexec-nox/handle` for client-side encryption (`encryptInput`) and decryption (`decrypt`), and Human Passport for recipient verification.

---

## How Nox actually works (and why the contracts are designed this way)

Nox is not an off-chain computation API that your frontend calls directly. Confidential computation is initiated from smart contracts and coordinated through the Nox infrastructure. Understanding this distinction is important because it fundamentally shapes the architecture of Kaelis.

### Handles instead of ciphertext

Client-side encryption begins with `encryptInput()` from the Nox SDK.

The plaintext value is securely transmitted to the Nox Handle Gateway, which returns:

- a 32-byte encrypted handle
- a corresponding proof

Only the handle and proof are submitted on-chain. The original plaintext allocation never reaches Ethereum.

### Asynchronous confidential computation

Operations such as:

```solidity
Nox.add(a, b)
Nox.sub(a, b)
Nox.mul(a, b)
```

do not execute arithmetic directly inside the EVM.

Instead they emit a `NoxCompute` event containing references to encrypted handles.

The Nox Runner observes the event, performs confidential computation inside a Trusted Execution Environment (TEE), and produces a new encrypted result.

The returned handle is immediately valid for additional confidential operations inside the same transaction, but human-readable decryption becomes available only after the Runner finishes processing.

For this reason Kaelis treats decryption as a genuinely asynchronous operation rather than assuming results are immediately available.

### Access Control Lists

Every encrypted handle owns an on-chain Access Control List.

Kaelis uses three permission primitives extensively:

- `Nox.allowThis(handle)` allows the current contract to continue using the handle in future transactions.
- `Nox.allow(handle, address)` grants decryption rights to a specific address.
- `Nox.addViewer(handle, address)` grants selective disclosure without administrative privileges.

This enables Kaelis' selective disclosure model, where auditors can inspect confidential allocations without exposing them publicly.

### Confidential control flow

Encrypted values cannot be used directly inside Solidity control flow.

Statements such as:

```solidity
require(balance >= amount);
```

cannot operate on encrypted values.

Instead Kaelis relies on:

- `Nox.safeAdd`
- `Nox.safeSub`
- `Nox.select`

to perform confidential arithmetic without revealing intermediate values.

`claim()` computes the recipient's vested amount, subtracts previously claimed tokens, and selects the appropriate encrypted result without leaking information through transaction failures.

---

## Human Passport integration

Human Passport complements Nox by solving a different problem.

While Nox protects confidential allocation data, Human Passport verifies recipient uniqueness before confidential claims are processed.

This combination allows Kaelis to provide:

- confidential allocations
- confidential claim amounts
- confidential balances
- Sybil-resistant recipient verification

Campaign creators may optionally require Human Passport verification before recipients become eligible to claim.

---

## Why one `KaelisCampaignManager` instead of four contracts

Airdrops, Vesting, Payroll, and Grants differ only in how tokens unlock.

The confidential lifecycle remains identical.

Every campaign shares:

- encrypted allocation handles
- encrypted claimed handles
- identical confidential claim arithmetic
- identical permission management
- identical confidential transfer flow

Rather than duplicating nearly identical confidential logic across multiple contracts, Kaelis represents campaign behaviour through `CampaignType`.

The only campaign-specific logic exists inside `_vestedBasisPoints()`, which operates entirely on plaintext timestamps because only token amounts are considered confidential.

---

## Funding and claiming flow

```text
Distributor
      │
      ├── encryptInput(funding)
      ▼
Nox Handle Gateway
      │
      ▼
KaelisToken.mint()
      │
      ▼
KaelisCampaignManager

Create Campaign
      │
      ▼
encryptInput(allocation)
      │
      ▼
Add Recipient
      │
      ▼
Seal Campaign

────────────────────────────────────

Recipient
      │
      ▼
Human Passport Verification
      │
      ▼
claim()
      │
      ▼
Confidential arithmetic
(safeSub + select)
      │
      ▼
KaelisToken.confidentialTransfer()
      │
      ▼
Recipient receives confidential tokens
      │
      ▼
decrypt()
```

The `confidentialTransfer(address, euint256)` overload requires the caller to already possess ACL access to the encrypted amount handle.

Since `KaelisCampaignManager` grants itself permission through `Nox.allowThis(claimable)` immediately before calling the token contract, the authorization succeeds without requiring additional contract interactions.

---

## Deliberate scope decisions

### No local Docker-backed Nox stack

Although the Nox Hardhat plugin supports a complete local off-chain stack, Kaelis was intentionally developed and tested directly against Ethereum Sepolia.

This matches the production environment and avoids Docker dependencies inside GitHub Codespaces.

`hardhat.config.ts` explicitly enables:

```ts
nox.skipTestOverride = true;
```

to make this workflow explicit.

### Injected wallets only

Kaelis currently supports injected wallets such as:

- MetaMask
- Rabby
- Coinbase Wallet

WalletConnect is intentionally omitted to keep the demo focused.

### Standardised encrypted values

All confidential values use `euint256`.

Although the SDK supports additional encrypted primitive types, a single encrypted integer representation simplifies confidential arithmetic throughout the application.

---

## Verified against source

Every `Nox.*` function, the complete `ERC7984` inheritance chain, the `@iexec-nox/handle` SDK, and the deployed Sepolia Nox contracts were verified directly from the official npm packages rather than inferred solely from documentation.

Both `KaelisCampaignManager` and `KaelisToken` compile against the published packages and were validated throughout development using the generated ABIs inside `artifacts-check/`.
