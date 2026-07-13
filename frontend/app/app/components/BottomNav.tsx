'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PRIMARY_ITEMS = [
  { href: '/app', label: 'Dashboard', icon: 'dashboard' as const },
  { href: '/app/distributions', label: 'Distributions', icon: 'distributions' as const },
  { href: '/app/claims', label: 'Claims', icon: 'claims' as const },
];

const MORE_ITEMS = [
  { href: '/app/vesting', label: 'Vesting', icon: 'vesting' as const, comingSoon: true },
  { href: '/app/payroll', label: 'Payroll', icon: 'payroll' as const, comingSoon: true },
  { href: '/app/grants', label: 'Grants', icon: 'grants' as const, comingSoon: true },
  { href: '/app/overview', label: 'Overview', icon: 'overview' as const, comingSoon: true },
  { href: '/app/reports', label: 'Reports', icon: 'reports' as const, comingSoon: true },
  { href: '/app/team', label: 'Team', icon: 'team' as const, comingSoon: true },
  { href: '/app/settings', label: 'Settings', icon: 'settings' as const, comingSoon: true },
];

/**
 * Mobile-only bottom tab bar (hidden above 768px via CSS -- see
 * .kaelis-bottom-nav's media query in app-shell.css). The sidebar's full nav list is
 * too long to fit as bottom tabs, so this surfaces the 3 most-used destinations
 * directly and puts everything else behind a "More" sheet, matching the original
 * product mockup's bottom-tab pattern (Dashboard / Distributions / Campaigns / More).
 */
export function BottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isMoreActive = MORE_ITEMS.some((item) => item.href === pathname);

  return (
    <>
      <nav className="kaelis-bottom-nav">
        {PRIMARY_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`kaelis-bottom-nav__item${pathname === item.href ? ' kaelis-bottom-nav__item--active' : ''}`}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          className={`kaelis-bottom-nav__item${isMoreActive ? ' kaelis-bottom-nav__item--active' : ''}`}
          onClick={() => setIsMoreOpen(true)}
          aria-label="More"
          aria-expanded={isMoreOpen}
        >
          <NavIcon name="more" />
          <span>More</span>
        </button>
      </nav>

      {isMoreOpen && (
        <div className="kaelis-more-sheet-backdrop" onClick={() => setIsMoreOpen(false)}>
          <div
            className="kaelis-more-sheet"
            role="dialog"
            aria-label="More navigation options"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kaelis-more-sheet__handle" aria-hidden />
            <div className="kaelis-more-sheet__grid">
              {MORE_ITEMS.map((item) =>
                item.comingSoon ? (
                  <div
                    key={item.href}
                    className="kaelis-more-sheet__item kaelis-more-sheet__item--disabled"
                    aria-disabled="true"
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.label}</span>
                    <span className="kaelis-coming-soon-badge">Coming soon</span>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="kaelis-more-sheet__item"
                    onClick={() => setIsMoreOpen(false)}
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    dashboard: 'M4 4h6v6H4zM12 4h6v6h-6zM4 12h6v6H4zM12 12h6v6h-6z',
    distributions: 'M10 2v16M2 10h16',
    claims: 'M4 4h12v14l-6-3-6 3z',
    vesting: 'M3 15l4-5 4 3 6-8',
    payroll: 'M3 6h14v10H3zM3 9h14',
    grants: 'M10 2l2.5 5.5L18 9l-4.5 4L14.5 18 10 15l-4.5 3 1-5L2 9l5.5-1.5z',
    overview: 'M3 13l4-6 4 3 6-8',
    reports: 'M5 3h10v14H5zM8 7h4M8 10h4M8 13h2',
    team: 'M7 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM13 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 16c0-2.8 2.2-5 5-5s5 2.2 5 5M11 11.5c2.2.4 4 2.2 4 4.5',
    settings:
      'M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10 2v2.2M10 15.8V18M4.2 4.2l1.6 1.6M14.2 14.2l1.6 1.6M2 10h2.2M15.8 10H18M4.2 15.8l1.6-1.6M14.2 5.8l1.6-1.6',
    more: 'M4 10h.01M10 10h.01M16 10h.01',
  };

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={paths[name] ?? paths.dashboard}
        stroke="currentColor"
        strokeWidth={name === 'more' ? 2.4 : 1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
