import Link from 'next/link';
import './docs.css';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'setup', label: 'Setup' },
  { id: 'deploying-contracts', label: 'Deploying contracts' },
  { id: 'deploying-frontend', label: 'Deploying the frontend' },
  { id: 'using-the-app', label: 'Using the app' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'faq', label: 'FAQ' },
];

export const metadata = {
  title: 'Documentation — Kaelis',
  description: 'Setup, deployment, and usage documentation for Kaelis, a confidential token operations platform built on iExec Nox.',
};

export default function DocsPage() {
  return (
    <div className="kaelis-docs">
      <header className="kaelis-docs__header">
        <Link href="/" className="kaelis-docs__brand">
          <ChipMark />
          <span>KAELIS</span>
        </Link>
        <Link href="/app" className="kaelis-docs__cta">
          Launch App
        </Link>
      </header>

      <div className="kaelis-docs__layout">
        <nav className="kaelis-docs__nav" aria-label="Documentation sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.label}
            </a>
          ))}
        </nav>

        <main className="kaelis-docs__content">
          <h1>Documentation</h1>
          <p className="kaelis-docs__lede">
            Everything needed to set up, deploy, and use Kaelis — a confidential token
            operations platform built on iExec Nox, deployed on Ethereum Sepolia.
          </p>

          <section id="overview">
            <h2>Overview</h2>
            <p>
              Kaelis lets distributors create confidential token distributions —
              airdrops, vesting schedules, payroll, and milestone-gated grants —
              where recipient allocations are encrypted end-to-end using iExec Nox.
              Only the recipient, or someone they explicitly grant view access to,
              can ever see the real amount. Every operation is still a real,
              verifiable on-chain transaction.
            </p>
          </section>

          <section id="setup">
            <h2>Setup</h2>
            <p>Prerequisites:</p>
            <ul>
              <li>Node.js 20+</li>
              <li>A Sepolia RPC URL (Alchemy or Infura)</li>
              <li>Two funded Sepolia wallets — a distributor and a recipient</li>
              <li>An injected browser wallet (MetaMask, Rabby, etc.)</li>
            </ul>
            <pre>
              <code>{`git clone https://github.com/Chikwenduagwu/Kaelis.git
cd Kaelis
npm install
cd frontend && npm install`}</code>
            </pre>
            <p>Root `.env` (contracts and scripts):</p>
            <pre>
              <code>{`SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=0xyour_deployer_key
RECIPIENT_PRIVATE_KEY=0xyour_recipient_key`}</code>
            </pre>
            <p>Frontend `.env.local`:</p>
            <pre>
              <code>{`NEXT_PUBLIC_KAELIS_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Server-only, no NEXT_PUBLIC_ prefix -- used by the faucet API route
DEPLOYER_PRIVATE_KEY=0xyour_deployer_key`}</code>
            </pre>
          </section>

          <section id="deploying-contracts">
            <h2>Deploying contracts</h2>
            <pre>
              <code>{`npx hardhat compile
npm run deploy:sepolia`}</code>
            </pre>
            <p>
              Deploys <code>KaelisToken</code> and <code>KaelisCampaignManager</code>,
              writing their addresses to <code>deployments/sepolia.json</code>. Copy
              both into your frontend environment variables.
            </p>
            <p>Verify the full confidential flow works before touching the UI:</p>
            <pre>
              <code>npm run demo:sepolia</code>
            </pre>
            <p>
              This mints tokens, creates a campaign, adds a recipient, seals it,
              claims, and decrypts the result end-to-end.
            </p>
          </section>

          <section id="deploying-frontend">
            <h2>Deploying the frontend</h2>
            <ol>
              <li>Import the repository into Vercel</li>
              <li>Set the project&apos;s Root Directory to <code>frontend</code></li>
              <li>
                Add the environment variables from Setup under Project Settings →
                Environment Variables — keep <code>DEPLOYER_PRIVATE_KEY</code> as a
                regular (non-public) variable
              </li>
              <li>Deploy</li>
            </ol>
          </section>

          <section id="using-the-app">
            <h2>Using the app</h2>
            <h3>Getting test tokens</h3>
            <p>
              Connect a wallet, open <strong>More → Faucet</strong>, and claim 1,000
              kUSD — minted directly to your connected wallet.
            </p>
            <h3>Creating a distribution</h3>
            <p>
              From <strong>Distributions → New distribution</strong>, choose a type
              (Airdrop, Vesting, Payroll, or Grant), select the asset, add recipients
              and their allocations, then review and deploy. This transfers the total
              allocation from your own balance into the campaign pool, then creates
              and seals the campaign — you&apos;ll confirm several transactions along
              the way.
            </p>
            <h3>Claiming</h3>
            <p>
              The <strong>Claims</strong> page automatically scans every campaign for
              ones your connected wallet is eligible on — no manual campaign ID entry.
              Each eligible campaign shows its own claim button and decrypted status.
            </p>
          </section>

          <section id="architecture">
            <h2>Architecture</h2>
            <p>
              For the full design rationale — including exactly how Nox&apos;s
              encrypted handles, ACL grants, and off-chain compute pipeline are used —
              see{' '}
              <a
                href="https://github.com/Chikwenduagwu/Kaelis/blob/main/ARCHITECTURE.md"
                target="_blank"
                rel="noreferrer"
              >
                ARCHITECTURE.md
              </a>{' '}
              in the repository.
            </p>
          </section>

          <section id="faq">
            <h2>FAQ</h2>
            <p>
              See the{' '}
              <Link href="/#faq">FAQ section</Link> on the landing page for common
              questions about confidentiality, verifiability, and supported assets.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

function ChipMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 2 L4 18 L7 18 L7 11 L13 18 H17 L9.5 9.5 L16.5 2 H12.5 L7 8.3 V2 Z" fill="var(--kaelis-gold)" />
    </svg>
  );
              }
