'use client';

import Link from 'next/link';
import { ConnectWalletButton } from '../components/ConnectWalletButton';

// Faceless/unrecognizable professional reviewing documents -- fits the "confidential
// financial decision-making" theme without depicting a real identifiable person.
// Photo by Sora Shimazaki, Pexels (free to use, no attribution required by license,
// credited here anyway as good practice).
const HERO_IMAGE =
  'https://images.pexels.com/photos/5668837/pexels-photo-5668837.jpeg?auto=compress&cs=tinysrgb&w=1920';

export function Hero() {
  return (
    <section className="kaelis-hero-v4">
      <div className="kaelis-hero-v4__bg" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
      <div className="kaelis-hero-v4__overlay" />

      <nav className="kaelis-nav-v4">
        <div className="kaelis-nav-v4__pill">
          <div className="kaelis-nav-v4__brand">
            <ChipMark />
            <span>KAELIS</span>
          </div>
          <div className="kaelis-nav-v4__links">
            <a href="#docs">Method</a>
            <a href="#docs">Agent</a>
            <a href="#docs">Signals</a>
          </div>
          <Link href="/app" className="kaelis-nav-v4__cta">
            Open App
          </Link>
        </div>
      </nav>

      <div className="kaelis-hero-v4__content">
        <h1 className="kaelis-hero-v4__title">
          See the shift before
          <br />
          it becomes obvious
        </h1>
        <p className="kaelis-hero-v4__subtitle">
          Kaelis turns confidential token operations into a verifiable outcome:
          encrypted allocations, an on-chain proof, and one claim worth trusting.
        </p>
        <div className="kaelis-hero-v4__links">
          <Link href="/app/distributions/new" className="kaelis-hero-v4__link">
            Create a distribution
          </Link>
          <span className="kaelis-hero-v4__link-divider" aria-hidden />
          <a href="#docs" className="kaelis-hero-v4__link">
            See how it works
          </a>
        </div>
      </div>

      <div className="kaelis-hero-v4__banner">
        <span>Encrypted allocations. Verifiable proof. One confidential claim.</span>
        <div className="kaelis-hero-v4__banner-actions">
          <ConnectWalletButton />
          <Link href="/app" className="kaelis-hero-v4__banner-cta">
            Open the app
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ChipMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 2 L4 18 L7 18 L7 11 L13 18 H17 L9.5 9.5 L16.5 2 H12.5 L7 8.3 V2 Z" fill="var(--kaelis-gold)" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
