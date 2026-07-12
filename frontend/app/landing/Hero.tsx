'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ConnectWalletButton } from '../components/ConnectWalletButton';

const SLIDES = [
  {
    // Blue-lit illuminated server rack, close-up (Pexels, panumas nikhomkhai)
    src: 'https://images.pexels.com/photos/17489160/pexels-photo-17489160.jpeg?auto=compress&cs=tinysrgb&w=1920',
    alt: 'Illuminated server rack in a modern data center',
  },
  {
    // Blue-lit server room, wide shot (Pexels, panumas nikhomkhai)
    src: 'https://images.pexels.com/photos/17323801/pexels-photo-17323801.jpeg?auto=compress&cs=tinysrgb&w=1920',
    alt: 'Modern server room with blue illumination',
  },
  {
    // Moody black server racks, network infrastructure (Pexels, Brett Sayles)
    src: 'https://images.pexels.com/photos/5203849/pexels-photo-5203849.jpeg?auto=compress&cs=tinysrgb&w=1920',
    alt: 'Rows of network server racks in a data center',
  },
];

const SLIDE_INTERVAL_MS = 5000;

export function Hero() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="kaelis-hero-v2">
      <div className="kaelis-hero-v2__slides" aria-hidden="true">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            className={`kaelis-hero-v2__slide${i === activeSlide ? ' kaelis-hero-v2__slide--active' : ''}`}
            style={{ backgroundImage: `url(${slide.src})` }}
          />
        ))}
        <div className="kaelis-hero-v2__overlay" />
      </div>

      <nav className="kaelis-nav-v2">
        <div className="kaelis-nav-v2__brand">
          <ChipMark />
          <span>KAELIS</span>
        </div>
        <div className="kaelis-nav-v2__links">
          <a href="#about">About</a>
          <a href="#docs">Docs</a>
          <a href="https://github.com" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/app" className="kaelis-nav-v2__cta">
            Launch App
          </Link>
          <ConnectWalletButton />
        </div>
      </nav>

      <div className="kaelis-hero-v2__content">
        <span className="kaelis-eyebrow kaelis-eyebrow--dark">Confidential Token Operations</span>
        <h1 className="kaelis-hero-v2__title">
          Delivering
          <br />
          <span className="kaelis-hero-v2__title--accent">Confidentiality</span>
        </h1>
        <p className="kaelis-hero-v2__subtitle">
          Privacy-first token distributions, vesting, payroll and grants — powered by
          iExec Nox confidential computing.
        </p>
        <div className="kaelis-hero-v2__actions">
          <Link href="/app" className="kaelis-btn kaelis-btn--primary">
            Launch App
          </Link>
          <a href="#docs" className="kaelis-btn kaelis-btn--outline-light">
            Documentation
          </a>
        </div>
      </div>

      <div className="kaelis-hero-v2__dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`kaelis-hero-v2__dot${i === activeSlide ? ' kaelis-hero-v2__dot--active' : ''}`}
            onClick={() => setActiveSlide(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

function ChipMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="var(--kaelis-gold)" strokeWidth="1.4" />
      <path d="M8 7v6M8 10l3-3M8.6 10.2 11 13" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
                    }
