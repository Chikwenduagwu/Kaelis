# Architecture

## Overview

Kaelis has three moving pieces:

1. **`KaelisCampaignManager.sol`** — the confidential distribution engine. Tracks
   campaigns (Airdrop / Vesting / Payroll / Grant), recipients, and encrypted
   allocation/claimed-amount state.
2. **`KaelisToken.sol`** — a native ERC-7984 confidential token, extending the
   official `@iexec-nox/nox-confidential-contracts` `ERC7984` reference
   implementation. Campaigns are funded by minting/transferring `KaelisToken` into
   the campaign manager's own balance; claims move value out of that pooled balance.
3. **Next.js frontend** — wagmi/viem for wallet + contract reads, `@iexec-nox/handle`
   for client-side encryption (`encryptInput`) and decryption (`decrypt`).

## How Nox actually works (and why the contracts are shaped this way)

This section exists because it's easy to describe Nox as "an off-chain compute API
you call from your frontend," which is wrong and would have led to a materially
different (and non-functional) contract design. The real mechanics, confirmed against
the `@iexec-nox/nox-protocol-contracts` and `@iexec-nox/nox-confidential-contracts`
npm packages:

- **Handles, not ciphertext-in-calldata.** Encrypting a value with the JS SDK's
  `encryptInput()` sends the plaintext over TLS to Nox's Handle Gateway, which returns
  a 32-byte `handle` (a pointer) and a `handleProof`. Your transaction includes only
  the handle and proof — the plaintext never touches the chain.
- **Computation is asynchronous and on-chain-triggered.** A Solidity call like
  `Nox.add(a, b)` doesn't compute the sum synchronously in the EVM. It emits a
  `NoxCompute` event carrying input/output handle references; an off-chain **Runner**
  picks up that event, performs the real arithmetic inside a TEE, and eventually the
  result becomes decryptable. The handle returned on-chain is valid *immediately* for
  further on-chain composition (you can pass it into the next `Nox.*` call in the same
  transaction), but a *human* trying to decrypt that result may need to wait a few
  seconds for the off-chain Runner to catch up. This is why
  `frontend/lib/useDecryptHandle.ts` treats decryption as a genuine async operation
  with a real "pending" state, not a spinner masking an instant call — the underlying
  SDK's `decrypt()` retries with backoff internally for exactly this reason
  (confirmed in `@iexec-nox/handle`'s source, `methods/decrypt.ts`).
- **ACLs, not access lists you build yourself.** Every handle has an on-chain Access
  Control List. `Nox.allowThis(handle)` lets the contract itself keep reusing the
  handle in later transactions; `Nox.allow(handle, address)` grants a specific address
  decrypt rights; `Nox.addViewer(handle, address)` grants read-only audit access
  without full admin rights. `KaelisCampaignManager.grantViewer()` uses this directly
  for the "selective disclosure" story — an auditor can be given visibility into a
  specific recipient's allocation without that data ever becoming public.
- **You cannot branch control flow on encrypted data.** There is no way to write
  `require(encryptedAmount <= encryptedBalance)` — Solidity's `if`/`require` need a
  plaintext boolean, and the whole point is that the amount isn't plaintext. Nox
  provides `Nox.safeSub`/`Nox.safeAdd`, which return `(ebool success, euint256
  result)`, and `Nox.select(condition, ifTrue, ifFalse)`, which lets you pick between
  two encrypted values based on an encrypted condition. `KaelisCampaignManager.claim()`
  uses exactly this pattern: if a recipient tries to claim more than they're vested
  for, the claimable amount silently resolves to the correct (smaller, or zero)
  figure instead of reverting. This matters for privacy, not just UX — a revert
  triggered by a failed encrypted comparison would leak information (that the
  requested amount exceeded the true balance) through the mere fact that the
  transaction failed.

## Why one `KaelisCampaignManager` instead of four separate contracts

Airdrops, vesting, payroll, and grants differ in *when* tokens unlock, not in *how*
confidentiality is enforced. A payroll schedule is linear vesting with shorter,
recurring periods; a grant is vesting gated additionally by milestone completion. All
four share:

- the same encrypted allocation/claimed-amount handle pair per recipient,
- the same `safeSub` + `select` claim-math pattern,
- the same ACL-granting sequence after every mutation.

Building four near-identical contracts would have meant either drifting out of sync
on the (security-critical) encrypted arithmetic, or extracting a shared library
anyway — so `CampaignType` is a field, not a contract boundary. `_vestedBasisPoints()`
is the one function that actually branches per type, and it operates entirely on
plaintext timestamps (which aren't sensitive — only *amounts* are confidential).

## Funding and claiming flow

```
Distributor                     KaelisToken                KaelisCampaignManager
    |                                |                              |
    |--- encryptInput(fundAmount) -->|  (via Nox Handle Gateway)     |
    |--- mint(manager, handle) ---------------------------->|        |
    |                                |<--- balance updated ---------|
    |                                |                              |
    |--- createCampaign(...) --------------------------------------->|
    |--- encryptInput(allocation) -->|  (via Nox Handle Gateway)     |
    |--- addRecipient(id, r, handle, proof) -------------------------->|
    |--- sealCampaign(id) --------------------------------------------->|

Recipient                                                  KaelisCampaignManager
    |--- claim(id) ---------------------------------------------------->|
    |                                                     computes vested - claimed
    |                                                     via safeSub + select
    |                                                     calls KaelisToken.confidentialTransfer(
    |                                                       recipient, claimable)  <- moves value
    |<---------------------------------------- Claimed event -----------|
    |--- decrypt(claimedHandle) ---->|  (via Nox Handle Gateway, EIP-712 signed)
```

The `confidentialTransfer(address, euint256)` overload used inside `claim()` requires
the caller to already hold ACL access on the amount handle (`Nox.isAllowed`) — since
`KaelisCampaignManager` is the caller and it just ran `Nox.allowThis(claimable)`
moments earlier, this check passes without any extra plumbing.

## Deliberate scope decisions

- **No local Docker-backed Nox test stack.** The `nox-hardhat-plugin` can boot a full
  offchain stack (Handle Gateway, KMS simulator) locally for `hardhat test`. Given
  this project's environment (GitHub Codespaces, no local Docker), we deploy and
  iterate directly against Sepolia instead, where Nox's real infrastructure is
  already live. `hardhat.config.ts` sets `nox.skipTestOverride: true` to make this
  explicit rather than have `hardhat test` silently attempt (and fail) to launch
  Docker.
- **Injected wallet only, no WalletConnect**, per the product brief — this keeps the
  wallet surface to MetaMask/Rabby/Coinbase Wallet-class extensions.
- **`uint256`-only encryption.** Nox's `encryptInput()` currently supports `bool`,
  `uint16`, `uint256`, `int16`, `int256` (confirmed in `@iexec-nox/handle` source).
  All Kaelis amounts use `euint256`, so this isn't a limitation in practice.

## Verified-against-source, not assumed

Every `Nox.*` function call, the `ERC7984`/`ERC7984Base` inheritance chain, the
`@iexec-nox/handle` SDK's method signatures, and the deployed Sepolia `NoxCompute`
address (`0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF`) were confirmed by downloading
and reading the actual npm packages (`@iexec-nox/nox-protocol-contracts@0.2.4`,
`@iexec-nox/nox-confidential-contracts@0.2.2`, `@iexec-nox/handle@0.1.0-beta.13`)
rather than inferred from documentation alone. Both contracts compile cleanly against
these real packages (see `artifacts-check/` for compiled ABIs generated during
development).
