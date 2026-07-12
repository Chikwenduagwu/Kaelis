'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import { ConnectWalletButton } from '../components/ConnectWalletButton';
import { VaultIllustration } from './VaultIllustration';
import { VaultTags } from './VaultTags';

const FEATURE_STRIP = [
  { title: 'Confidential by Default', icon: 'shield' as const },
  { title: 'Powered by iExec Nox', icon: 'cube' as const },
  { title: 'Verifiable on-chain', icon: 'check' as const },
  { title: 'Developer Friendly', icon: 'code' as const },
];

export function Hero() {
  return (
    <section className="kaelis-hero-v3">
      <nav className="kaelis-nav-v3">
        <div className="kaelis-nav-v3__brand">
          <ChipMark />
          <span>KAELIS</span>
        </div>
        <div className="kaelis-nav-v3__right">
          <ConnectWalletButton />
          <button className="kaelis-nav-v3__menu" aria-label="Open menu">
            <MenuIcon />
          </button>
        </div>
      </nav>

      <div className="kaelis-hero-v3__body">
        <div className="kaelis-hero-v3__copy">
          <span className="kaelis-eyebrow">
            <LockBadgeIcon />
            Confidential Token Operations
          </span>
          <h1 className="kaelis-hero-v3__title">
            Delivering
            <br />
            <span className="kaelis-hero-v3__title--accent">Confidentiality.</span>
          </h1>
          <p className="kaelis-hero-v3__subtitle">
            Privacy-first token distributions, vesting, payroll and grants — powered
            by iExec Nox confidential computing.
          </p>
          <div className="kaelis-hero-v3__actions">
            <Link href="/app" className="kaelis-btn kaelis-btn--primary">
              Launch App
              <ArrowIcon />
            </Link>
            <a href="#docs" className="kaelis-btn kaelis-btn--secondary">
              <BookIcon />
              Documentation
            </a>
          </div>
        </div>
      </div>

      <div className="kaelis-vault-stage">
        <VaultTags />
        <VaultIllustration />
      </div>

      <div className="kaelis-hero-v3__tagline">
        <span className="kaelis-hero-v3__tagline-small">Protect the data.</span>
        <span className="kaelis-hero-v3__tagline-large">Verify the outcome.</span>
        <span className="kaelis-hero-v3__tagline-rule" aria-hidden />
      </div>

      <div className="kaelis-hero-v3__strip">
        {FEATURE_STRIP.map((f) => (
          <div className="kaelis-hero-v3__strip-item" key={f.title}>
            <StripIcon name={f.icon} />
            <span>{f.title}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChipMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 2 L4 18 L7 18 L7 11 L13 18 H17 L9.5 9.5 L16.5 2 H12.5 L7 8.3 V2 Z" fill="var(--kaelis-gold)" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 6h14M3 10h14M3 14h14" stroke="var(--kaelis-ink)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LockBadgeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="var(--kaelis-gold)" strokeWidth="1.3" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="var(--kaelis-gold)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 3.5c1.5-.7 3.3-.7 5.5.3v9c-2.2-1-4-1-5.5-.3z M13.5 3.5c-1.5-.7-3.3-.7-5.5.3v9c2.2-1 4-1 5.5-.3z"
        stroke="var(--kaelis-ink)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StripIcon({ name }: { name: 'shield' | 'cube' | 'check' | 'code' }) {
  const paths: Record<string, ReactElement> = {
    shield: (
      <path
        d="M11 2.5 L18.5 5.5 V10.5 C18.5 15 15.4 18.8 11 19.6 C6.6 18.8 3.5 15 3.5 10.5 V5.5 Z M8 11 L10.2 13.2 L14.5 8"
        stroke="var(--kaelis-gold)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    ),
    cube: (
      <path
        d="M11 3 L18 7 V15 L11 19 L4 15 V7 Z M11 3 V11 M4 7 L11 11 L18 7 M11 11 V19"
        stroke="var(--kaelis-gold)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    ),
    check: (
      <path
        d="M11 2.5 L18.5 5.5 V10.5 C18.5 15 15.4 18.8 11 19.6 C6.6 18.8 3.5 15 3.5 10.5 V5.5 Z M7.5 11 L9.7 13.2 L14.5 8"
        stroke="var(--kaelis-gold)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    ),
    code: (
      <path
        d="M8 6 L4 11 L8 16 M14 6 L18 11 L14 16"
        stroke="var(--kaelis-gold)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  };
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
