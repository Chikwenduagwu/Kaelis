# Developer Feedback — iExec Nox

Notes from building Kaelis (confidential token distributions, vesting, payroll, and
grants) on Nox for this hackathon. Written to be genuinely useful to the Nox team,
covering both what worked well and the friction points we actually hit including one
real bug the team helped us root-cause and fix mid-build.

## What worked well

- **The Solidity API surface is small and composable.** Once you internalize that
  `euint256`/`ebool` values only ever move through `Nox.*` functions and never through
  native Solidity operators, the mental model clicks quickly. `safeAdd`/`safeSub`
  returning `(ebool, T)` paired with `select()` is a clean, general pattern for
  "conditional logic on encrypted data without branching" — we reused it everywhere
  (claim math, milestone gating).
- **The ERC-7984 reference implementation (`@iexec-nox/nox-confidential-contracts`)
  is genuinely drop-in.** Extending `ERC7984` and adding owner-gated `mint`/`burn`
  took minutes, not hours, and it already handles the harder parts (safe-subtract-
  based transfers, operator delegation, `confidentialTransferAndCall`).
- **`@iexec-nox/handle`'s network auto-detection was correct out of the box** for
  Ethereum Sepolia, no manual gateway/subgraph URL configuration was needed once we
  pointed a viem/ethers client at the right chain.
- **The team's Discord support was excellent once we had a precise repro.** We
  traced a real bug down to a specific missing ACL grant and the team confirmed the
  root cause and gave the exact one-line fix within the same thread — see below.

## The real bug we hit (and the fix)

Our `KaelisCampaignManager.claim()` computes a `claimable` amount as a *fresh*
encrypted handle (via `Nox.mul`/`Nox.div`/`Nox.safeSub`/`Nox.select`), then calls
`IERC7984(token).confidentialTransfer(recipient, claimable)` so the token contract
pays out from a pool the manager holds. This reliably reverted with
`NotAllowed(bytes32 handle, address account)`, where `account` decoded to the
**token contract's own address** — not the manager, not the recipient.

Root cause (confirmed by the Nox team): `confidentialTransfer(address, euint256)`
only checks that the *caller* is allowed on the amount handle
(`require(Nox.isAllowed(amount, msg.sender))`). Internally it then executes
`Nox.transfer(...)` **as the token contract**, and `NoxCompute` authorizes based on
whoever actually executes that low-level operation — the token, not the caller. The
`externalEuint256 + proof` overload of `confidentialTransfer` sidesteps this because
`fromExternal` auto-grants the token transient access as a side effect; the plain
`euint256` overload (the one you use when passing an already-computed handle, as we
were) does not, and the calling contract is expected to grant it explicitly.

**Fix**, one line before the transfer call:

\`\`\`solidity
Nox.allowThis(claimable);
Nox.allow(claimable, msg.sender);
Nox.allowTransient(claimable, campaign.token); // token needs access to run its
                                                 // internal Nox.transfer
IERC7984(campaign.token).confidentialTransfer(msg.sender, claimable);
\`\`\`

This is a genuinely easy trap to fall into for any multi-contract confidential flow
(a manager/vault contract calling into a token contract with a handle it just
computed), and it isn't obvious from the ERC7984Base source alone — you have to trace
through to `_updateWithOptimizedPrimitives` to see where the token needs access it was
never given. **Suggestion**: call this out explicitly in the ERC-7984 guide, ideally
with the exact wording "if you're calling `confidentialTransfer(address, euint256)`
from another contract with a handle that contract computed itself, you must
`allowTransient` the token on that handle first" we would have found this in
minutes instead of days of investigation with that one sentence in the docs.

## Other friction points

1. **Docs vs. reality gap on package names and networks.** The developer resources
   page links to `docs.iex.ec/nox-protocol/...`, and separately we found real,
   working npm packages (`@iexec-nox/nox-protocol-contracts`,
   `@iexec-nox/nox-confidential-contracts`, `@iexec-nox/handle`) mostly by going
   straight to `npm view`/`npm search` against the `@iexec-nox` org, since the docs'
   prose doesn't surface the exact package names directly. A single "Packages" page
   linking npm name -> purpose -> version would save real time.
2. **The Hardhat plugin's Docker dependency isn't clearly optional in the getting
   started flow.** `skipTestOverride` exists as an escape hatch for Sepolia-only,
   no-Docker workflows (useful for cloud IDEs / CI without privileged mode), but we
   only discovered it was possible by reading the plugin's own option list, not from
   guided docs.
3. **The gap between "transaction confirmed" and "value is decryptable" isn't called
   out prominently.** We found the retry/backoff behavior in `decrypt()`
   (`NotYetComputedHandleError`) only by reading SDK source. A note in the Hello
   World guide "expect a real async gap between a tx confirming and its result
   being decryptable, budget your UI for it" would help frontend developers avoid
   either over-polling or building a UI that assumes instant decryption.
4. **No documented pattern for "fund a manager/vault contract, pay out later"** —
   this is a very common shape (any escrow, vault, payroll, or distributor contract)
   and is exactly where the `allowTransient` gap above bit us. A worked example in
   the guides for this specific pattern would have real value beyond just our case.
5. **RPC provider limits on `eth_getLogs` vary wildly and aren't Nox-specific, but
   they bit us hard while building the dashboard.** thirdweb's public Sepolia RPC
   caps at 1,000 blocks/call; Alchemy's free tier caps at just 10. Not a Nox issue
   directly, but worth a callout in the Hardhat/frontend guides that event-log-based
   dashboards should either use a paid RPC tier or, as we ended up doing, prefer
   plain `getCampaign`-style contract reads over `getLogs` where the data volume is
   small enough that a full scan is viable.

## Suggestions

- Publish a single canonical "API Reference" index page linking every `Nox.sol`
  function to a one-line description + signature, generated from source so it can
  never drift from the actual package.
- Add the `allowTransient`-for-multi-contract-flows callout described above to the
  ERC-7984 guide specifically — this is likely to trip up anyone building a vault,
  escrow, payroll, or distributor pattern, not just us.
- Add a short "latency model" diagram to the Hello World guide: tx submitted → event
  emitted → Runner picks up → TEE computes → result decryptable, with rough timing
  expectations on each hop.
- Consider a `nox-hardhat-starter` variant (or a documented flag) explicitly framed
  as "Sepolia-first, no local Docker" for teams in constrained dev environments.

## One UX idea we didn't have time to build

Our creation flow currently needs several separate wallet signatures for one logical
action (fund the pool, create the campaign, add each recipient, seal it). We looked
into collapsing this into a single signature via a `Multicall`-style batch function
on our own contract (encode each call, execute them all in one transaction), which is
a standard Solidity pattern, not a Nox-specific one but it's a real contract change
we didn't have time to redeploy and re-verify before submission. Flagging it here in
case it's useful context, and it might be worth iExec highlighting this pattern in
the guides too, since confidential-computing dApps in particular tend to have many
small encrypt-then-call steps that would benefit from batching.

Overall the actual primitives are well-designed, the ERC-7984 reference
implementation saved us real time, and the one real bug we hit had a fast, precise
resolution once we had a clear repro the friction was almost entirely in discovery
(finding the right package, the right pattern, the right async-timing expectations)
rather than in the API itself once found.
