'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { ConnectWalletButton } from '../components/ConnectWalletButton';
import { ConfidentialChip } from './ConfidentialChip';
import { Terminal } from './Terminal';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ['start start', 'end end'],
  });

  // Hero fades out over the first third of the pinned scroll range; terminal rises
  // and takes over for the remainder -- the "signature" cinematic handoff from the
  // brief, driven by scroll progress rather than a fixed-duration animation so it
  // stays perfectly in sync with the user's own scroll speed.
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.35], ['0%', '-8%']);
  const terminalY = useTransform(scrollYProgress, [0.15, 0.5], ['100%', '0%']);
  const terminalOpacity = useTransform(scrollYProgress, [0.15, 0.32], [0, 1]);

  return (
    <main className="kaelis-landing">
      {/* SECTION 1 + pinned transition wrapper: tall scroll track, sticky viewport */}
      <div ref={scrollRef} className="kaelis-pin-track">
        <div className="kaelis-pin-viewport">
          <motion.section
            style={{ opacity: heroOpacity, y: heroY }}
            className="kaelis-hero"
          >
            <nav className="kaelis-nav">
              <div className="kaelis-nav__brand">
                <ChipMark />
                <span>KAELIS</span>
              </div>
              <div className="kaelis-nav__links">
                <a href="#about">About</a>
                <a href="#docs">Docs</a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
                <Link href="/app" className="kaelis-nav__cta">
                  Launch App
                </Link>
                <ConnectWalletButton />
              </div>
            </nav>

            <div className="kaelis-hero__content">
              <div className="kaelis-hero__left">
                <span className="kaelis-eyebrow">Confidential Token Operations</span>
                <h1 className="kaelis-hero__title">
                  Privacy for token
                  <br />
                  distributions,
                  <br />
                  <span className="kaelis-hero__title--accent">by design.</span>
                </h1>
                <p className="kaelis-hero__subtitle">
                  Kaelis uses iExec Nox confidential computing to keep recipient
                  allocations, vesting schedules, and payroll private while remaining
                  verifiable on-chain.
                </p>
                <div className="kaelis-hero__actions">
                  <Link href="/app" className="kaelis-btn kaelis-btn--primary">
                    Launch App →
                  </Link>
                  <a href="#docs" className="kaelis-btn kaelis-btn--secondary">
                    Documentation
                  </a>
                </div>
                <ul className="kaelis-hero__badges">
                  <li>Privacy First</li>
                  <li>Confidential by Default</li>
                  <li>Verifiable Results</li>
                </ul>
              </div>

              <div className="kaelis-hero__right">
                <ConfidentialChip />
              </div>
            </div>
          </motion.section>

          <motion.section
            style={{ y: terminalY, opacity: terminalOpacity }}
            className="kaelis-terminal-section"
          >
            <Terminal />
            <Link href="/app" className="kaelis-btn kaelis-btn--primary kaelis-btn--large">
              Launch App
            </Link>
          </motion.section>
        </div>
      </div>

      {/* SECTION 3: footer, normal document flow (not part of the pin) */}
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
          <a href="https://github.com" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="#docs">Documentation</a>
          <span>Built with iExec Nox</span>
          <span>Ethereum Sepolia</span>
          <a href="https://github.com" target="_blank" rel="noreferrer">
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

function ChipMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="var(--kaelis-gold)" strokeWidth="1.4" />
      <path d="M8 7v6M8 10l3-3M8.6 10.2 11 13" stroke="var(--kaelis-ink)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
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
