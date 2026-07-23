'use client';

import Link from 'next/link';
import { Hero } from './Hero';
import { TerminalSection } from './TerminalSection';
import { FAQSection } from './FAQSection';

const FEATURES = [
  {
    title: 'Confidential by Default',
    body: 'All sensitive data is encrypted and never exposed.',
  },
  {
    title: 'Verifiable Results',
    body: 'Prove everything on-chain without revealing anything.',
  },
  {
    title: 'Built with Nox',
    body: "Powered by iExec Nox's confidential computing.",
  },
  {
    title: 'Flexible Operations',
    body: 'Distributions, vesting, payrolls, grants and more.',
  },
  {
    title: 'Developer Friendly',
    body: 'Easy to integrate with SDKs and APIs.',
  },
];

export function LandingPage() {
  return (
    <main className="kaelis-landing">
      <Hero />
      <TerminalSection />
      <FAQSection />

      <footer className="kaelis-footer" id="docs">
        <div className="kaelis-footer__features">
          {FEATURES.map((f) => (
            <div className="kaelis-footer__feature" key={f.title}>
              <FeatureIcon />
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>

        <div className="kaelis-footer__links">
          <a href="https://github.com/Chikwenduagwu/Kaelis" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/docs">Documentation</Link>
          <span>Built with iExec Nox</span>
          <span>Ethereum Sepolia</span>
          <a
            href="https://github.com/Chikwenduagwu/Kaelis/blob/main/feedback.md"
            target="_blank"
            rel="noreferrer"
          >
            feedback.md
          </a>
          <a href="#" target="_blank" rel="noreferrer">
            Video Demo
          </a>
        </div>
        <p className="kaelis-footer__copy">© {new Date().getFullYear()} Kaelis. Built on iExec Nox.</p>
      </footer>
    </main>
  );
}

function FeatureIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 4 L27 8 V15 C27 22 22 27 16 29 C10 27 5 22 5 15 V8 Z"
        stroke="var(--kaelis-gold)"
        strokeWidth="1.4"
      />
      <path d="M11 16 L14.5 19.5 L21 12" stroke="var(--kaelis-gold)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
