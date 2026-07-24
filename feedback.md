# Developer Feedback | iExec Nox

> Feedback from building **Kaelis**, a confidential token distribution platform supporting confidential distributions, vesting, payroll, and grants on the iExec Nox Protocol.

---

## Table of Contents

- [What Worked Well](#what-worked-well)
- [The Real Bug We Hit (and the Fix)](#the-real-bug-we-hit-and-the-fix)
- [Other Friction Points](#other-friction-points)
- [Suggestions](#suggestions)
- [One UX Idea We Didn't Have Time to Build](#one-ux-idea-we-didnt-have-time-to-build)
- [Final Thoughts](#final-thoughts)

---

# What Worked Well

<details open>
<summary><strong>Expand Section</strong></summary>

### Solidity API

The Solidity API surface is small and composable.

Once you internalize that `euint256` and `ebool` values only ever move through `Nox.*` functions and never through native Solidity operators, the mental model clicks quickly.

`safeAdd()` and `safeSub()` returning `(ebool, T)` paired with `select()` is a clean, general pattern for conditional logic on encrypted data without branching. We reused it throughout Kaelis for claim calculations and milestone gating.

---

### ERC-7984

The ERC-7984 reference implementation (`@iexec-nox/nox-confidential-contracts`) is genuinely drop-in.

Extending `ERC7984` and adding owner-gated `mint()` and `burn()` took minutes instead of hours. It already handles the difficult parts including:

- Safe subtract based transfers
- Operator delegation
- `confidentialTransferAndCall`

---

### Handle SDK

`@iexec-nox/handle` correctly detected Ethereum Sepolia without any manual gateway or subgraph configuration after pointing a viem/ethers client at the correct chain.

---

### Discord Support

The team's Discord support was excellent once we had a precise reproduction.

We traced a real issue down to a specific missing ACL grant, and the team confirmed the root cause while providing the exact one-line fix in the same thread.
<img width="720" height="1456" alt="1000618521" src="https://github.com/user-attachments/assets/59c56b7d-d066-47c5-8506-cc54e92d824a" />

</details>

---

# The Real Bug We Hit (and the Fix)

<details open>
<summary><strong>Expand Section</strong></summary>

Our `KaelisCampaignManager.claim()` computes a `claimable` amount as a fresh encrypted handle using:

- `Nox.mul`
- `Nox.div`
- `Nox.safeSub`
- `Nox.select`

The manager then calls:

```solidity
IERC7984(token).confidentialTransfer(recipient, claimable);
```

to pay recipients from the manager's pooled balance.

This consistently reverted with:

```
NotAllowed(bytes32 handle, address account)
```

where `account` decoded to **the token contract's own address**, not the manager contract or recipient.

## Root Cause

The Nox team confirmed that `confidentialTransfer(address, euint256)` only checks that the caller has permission on the encrypted handle.

Internally, however, the token contract executes `Nox.transfer(...)` as itself.

This means the token contract also requires transient permission on the encrypted handle.

The `externalEuint256 + proof` overload grants this automatically as part of `fromExternal()`, while the plain `euint256` overload expects the calling contract to grant access explicitly.

## Fix

Before calling the transfer:

```solidity
Nox.allowThis(claimable);
Nox.allow(claimable, msg.sender);
Nox.allowTransient(claimable, campaign.token);

IERC7984(campaign.token).confidentialTransfer(
    msg.sender,
    claimable
);
```

This is an easy trap for any multi-contract confidential flow such as vaults, escrow systems, payroll contracts, or token distributors.

It is not immediately obvious from the ERC7984Base source because the required permission only becomes apparent after tracing into `_updateWithOptimizedPrimitives`.

### Documentation Suggestion

Explicitly document this pattern in the ERC-7984 guide.

For example:

> If you're calling `confidentialTransfer(address, euint256)` from another contract using a handle computed inside that contract, you must grant the token contract transient access with `allowTransient()` before calling `confidentialTransfer()`.

That single sentence would likely save future developers days of debugging.

</details>

---

# Other Friction Points

<details open>
<summary><strong>Expand Section</strong></summary>

## 1. Package Discovery

The documentation links to `docs.iex.ec/nox-protocol/...`, but the exact npm packages are not surfaced prominently.

We discovered packages such as:

- `@iexec-nox/nox-protocol-contracts`
- `@iexec-nox/nox-confidential-contracts`
- `@iexec-nox/handle`

mostly by searching npm directly.

A dedicated Packages page listing package names, purpose, and current versions would save significant onboarding time.

---

## 2. Hardhat Plugin

The Hardhat plugin's Docker dependency is not clearly described as optional.

We only discovered `skipTestOverride` by reading plugin options rather than documentation.

A documented Sepolia-only workflow without Docker would help developers using cloud IDEs or CI.

---

## 3. Async Decryption

The gap between:

- Transaction confirmed

and

- Value decryptable

is not highlighted enough.

We only discovered the retry behavior (`NotYetComputedHandleError`) by reading SDK source.

A note in the Hello World guide explaining that decrypted values may become available shortly after transaction confirmation would help frontend developers build better user experiences.

---

## 4. Vault / Manager Pattern

There is currently no documented pattern for:

- Fund manager contract
- Compute confidential values
- Pay recipients later

This architecture is common for:

- Escrow
- Payroll
- Token distribution
- Treasury management

A worked example covering this pattern would be extremely valuable.

---

## 5. RPC Limits

RPC providers impose very different `eth_getLogs` limits.

Examples:

- Thirdweb public Sepolia RPC: 1,000 blocks
- Alchemy free tier: 10 blocks

This is not a Nox issue directly, but frontend documentation could recommend contract reads over large log scans when appropriate.

</details>

---

# Suggestions

<details open>
<summary><strong>Expand Section</strong></summary>

- Publish a canonical API Reference generated directly from `Nox.sol`.

- Add explicit documentation for `allowTransient()` in multi-contract confidential flows.

- Include a latency diagram in the Hello World guide:

```
Transaction Submitted
        ↓
Event Emitted
        ↓
Runner Picks Up
        ↓
TEE Computes
        ↓
Result Decryptable
```

- Consider a Sepolia-first version of `nox-hardhat-starter` for cloud development environments without Docker.

</details>

---

# One UX Idea We Didn't Have Time to Build

<details open>
<summary><strong>Expand Section</strong></summary>

Our creation flow currently requires several wallet signatures for one logical operation.

For example:

- Fund campaign
- Create campaign
- Add recipients
- Seal campaign

We considered batching these using a Multicall-style function executed in a single transaction.

This is a standard Solidity pattern rather than a Nox-specific feature, but it would significantly improve UX for confidential applications where multiple encrypt-then-call operations occur sequentially.

Highlighting batching patterns in the documentation could help future developers build smoother confidential application flows.

</details>

---

# Final Thoughts

Overall, the underlying primitives are well designed.

The ERC-7984 reference implementation saved us a significant amount of development time, and the one major issue we encountered had a fast and precise resolution once we produced a clear reproduction.

Most of the friction came from discovery:

- Finding the correct packages
- Discovering recommended patterns
- Understanding asynchronous decryption timing

Once those pieces were understood, the API itself was straightforward and enjoyable to work with.

Kaelis was a great opportunity to explore what confidential smart contracts can enable, and we hope this feedback helps improve the experience for future builders.
