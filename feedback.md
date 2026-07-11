# Developer Feedback — iExec Nox

Notes from building Kaelis (confidential token distributions/vesting/payroll/grants)
on Nox for this hackathon. Written to be genuinely useful to the Nox team, not just a
box to tick.

## What worked well

- **The Solidity API surface is small and composable.** Once you internalize that
  `euint256`/`ebool` values only ever move through `Nox.*` functions and never through
  native Solidity operators, the mental model clicks quickly. `safeAdd`/`safeSub`
  returning `(ebool, T)` paired with `select()` is a clean, general pattern for
  "conditional logic on encrypted data without branching" — we reused it everywhere
  (claim math, milestone gating).
- **The ERC-7984 reference implementation
  (`@iexec-nox/nox-confidential-contracts`) is genuinely drop-in.** Extending
  `ERC7984` and adding owner-gated `mint`/`burn` took minutes, not hours, and it
  already handles the harder parts (safe-subtract-based transfers, operator
  delegation, `confidentialTransferAndCall`).
- **`@iexec-nox/handle`'s network auto-detection was correct out of the box** for
  Ethereum Sepolia — no manual gateway/subgraph URL configuration was needed once we
  pointed a viem/ethers client at the right chain.

## Friction points

1. **Docs vs. reality gap on package names.** The developer resources page links to
   `docs.iex.ec/nox-protocol/...`, but the live docs actually resolve under
   `docs.noxprotocol.io`. More importantly, the *exact* npm package names
   (`@iexec-nox/nox-protocol-contracts`, `@iexec-nox/nox-confidential-contracts`,
   `@iexec-nox/handle`) aren't obviously discoverable from the docs' prose — we ended
   up going straight to `npm view`/`npm search` against the `@iexec-nox` org to find
   them, and then reading the actual `.sol`/`.ts` source inside the packages to get
   exact function signatures, because the reference pages for individual Solidity
   library functions (arithmetic, comparisons, `select`, ACL functions) didn't return
   indexable content when we searched for them. A single "API Reference" page linking
   directly to the real source (or generated docs from it) would have saved
   significant verification time.
2. **The Hardhat plugin's Docker dependency isn't optional-feeling in the getting
   started flow**, even though `skipTestOverride` exists as an escape hatch. It would
   help to have a documented "Sepolia-only, no Docker" quickstart as a first-class
   path for environments where Docker-in-Docker isn't available (cloud IDEs, CI
   runners without privileged mode), rather than something we had to infer was
   possible from a config flag's existence.
3. **The gap between "transaction confirmed" and "value is decryptable" isn't called
   out prominently enough for frontend developers.** We only discovered the retry
   behavior in `decrypt()` (`NotYetComputedHandleError` with backoff) by reading the
   SDK source directly. A prominent note in the Hello World guide — "your UI needs a
   pending state between tx confirmation and decrypt success, here's roughly how long
   to expect" — would prevent developers from either polling too aggressively or
   assuming decryption is instant and shipping a confusing UI.
4. **No dedicated guide for "funding a confidential contract with confidential
   tokens then paying out from its pooled balance"** — this is an extremely common
   pattern (any escrow, vault, or distributor contract) and required us to work out
   the `Nox.isAllowed(amount, msg.sender)` authorization requirement on
   `confidentialTransfer` by reading `ERC7984Base.sol` directly rather than finding it
   documented as a pattern.

## Suggestions

- Publish a single canonical "API Reference" index page that links every `Nox.sol`
  function to a one-line description + signature, generated from source so it can
  never drift from the actual package.
- Add a short "latency model" diagram to the Hello World guide: tx submitted → event
  emitted → Runner picks up → TEE computes → result decryptable, with rough timing
  expectations on each hop.
- Consider a `nox-hardhat-starter` variant (or a documented flag) explicitly framed
  as "Sepolia-first, no local Docker" for teams in constrained dev environments.

Overall the actual primitives are well-designed and the ERC-7984 reference
implementation saved us real time — the friction was almost entirely in discovery
(finding the right package/page) rather than in the API itself once found.
