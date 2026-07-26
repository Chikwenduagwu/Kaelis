import { NextRequest, NextResponse } from 'next/server';
import { JsonRpcProvider, Wallet, Contract, isAddress } from 'ethers';
import { createEthersHandleClient } from '@iexec-nox/handle';
import { getPassportScore } from '../passport/score/route';

// Node.js runtime required (not Edge) -- ethers signing + the Nox handle client both
// need real Node crypto/network APIs that aren't available in the Edge runtime.
export const runtime = 'nodejs';

const FAUCET_AMOUNT = 1_000n;

const TOKEN_ABI = [
  'function mint(address to, bytes32 encryptedAmount, bytes calldata inputProof) external returns (bytes32)',
];

/**
 * Faucet endpoint: mints a fixed amount of KaelisToken to the requesting address.
 *
 * KaelisToken.mint() is onlyOwner (see contracts/KaelisToken.sol), so a public faucet
 * cannot be done purely client-side -- no frontend cleverness lets a random visitor's
 * wallet call an owner-gated function. This route holds the deployer private key as a
 * server-only secret (DEPLOYER_PRIVATE_KEY, no NEXT_PUBLIC_ prefix -- never sent to
 * the browser) and signs the mint on the visitor's behalf.
 *
 * Sybil resistance: gated by Gitcoin/Human Passport score (see ../passport/score/route.ts).
 * This is checked server-side here regardless of what the frontend already showed the
 * user, since a client-side-only check can be bypassed by anyone hitting this endpoint
 * directly with curl/Postman.
 *
 * No per-wallet cooldown: per product decision, a passing-score wallet can claim
 * repeatedly. Vercel's API routes are stateless/serverless, so a true cooldown would
 * need external persistent storage (KV/DB) which this project doesn't have configured --
 * if a cooldown is wanted later, that's the piece to add, and the Passport cache above
 * would need to move to the same store.
 */
export async function POST(request: NextRequest) {
  const { SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, NEXT_PUBLIC_KAELIS_TOKEN_ADDRESS } = process.env;

  if (!SEPOLIA_RPC_URL || !DEPLOYER_PRIVATE_KEY || !NEXT_PUBLIC_KAELIS_TOKEN_ADDRESS) {
    return NextResponse.json(
      { error: 'Faucet is not configured on the server. Missing required environment variables.' },
      { status: 500 }
    );
  }

  let body: { address?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const recipient = body.address;
  if (!recipient || !isAddress(recipient)) {
    return NextResponse.json({ error: 'A valid wallet address is required.' }, { status: 400 });
  }

  // Gitcoin/Human Passport gate -- must pass before we ever touch the mint call
  try {
    const passport = await getPassportScore(recipient);
    if (!passport.passingScore) {
      return NextResponse.json(
        {
          error: `Passport score too low (${passport.score.toFixed(1)}/${passport.threshold}). Verify more stamps at passport.xyz and try again.`,
        },
        { status: 403 }
      );
    }
  } catch (err) {
    console.error('[faucet] passport check failed:', err);
    const message = err instanceof Error ? err.message : 'Passport verification failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  try {
    const provider = new JsonRpcProvider(SEPOLIA_RPC_URL);
    const deployer = new Wallet(DEPLOYER_PRIVATE_KEY, provider);
    const handleClient = await createEthersHandleClient(deployer);

    const encrypted = await handleClient.encryptInput(
      FAUCET_AMOUNT,
      'uint256',
      NEXT_PUBLIC_KAELIS_TOKEN_ADDRESS as `0x${string}`
    );

    const token = new Contract(NEXT_PUBLIC_KAELIS_TOKEN_ADDRESS, TOKEN_ABI, deployer);
    const tx = await token.mint(recipient, encrypted.handle, encrypted.handleProof);
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber?.toString(),
      amount: FAUCET_AMOUNT.toString(),
    });
  } catch (error) {
    console.error('[faucet] mint failed:', error);
    const message = error instanceof Error ? error.message : 'Faucet mint failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
      }
