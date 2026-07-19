'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_SECTIONS = [
  {
    label: 'Confidential Operations',
    items: [
      { href: '/app', label: 'Dashboard', icon: 'dashboard', comingSoon: false },
      { href: '/app/distributions', label: 'Distributions', icon: 'distributions', comingSoon: false },
      { href: '/app/claims', label: 'Claims', icon: 'claims', comingSoon: false },
      { href: '/app/faucet', label: 'Faucet', icon: 'faucet', comingSoon: false },
      { href: '/app/vesting', label: 'Vesting', icon: 'vesting', comingSoon: false },
      { href: '/app/payroll', label: 'Payroll', icon: 'payroll', comingSoon: false },
      { href: '/app/grants', label: 'Grants', icon: 'grants', comingSoon: false },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { href: '/app/overview', label: 'Overview', icon: 'overview', comingSoon: true },
      { href: '/app/reports', label: 'Reports', icon: 'reports', comingSoon: true },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/app/team', label: 'Team', icon: 'team', comingSoon: true },
      { href: '/app/settings', label: 'Settings', icon: 'settings', comingSoon: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="kaelis-sidebar">
      <div className="kaelis-sidebar__brand">
        <ChipMark />
        <span>KAELIS</span>
      </div>

      <nav className="kaelis-sidebar__nav">
        {NAV_SECTIONS.map((section) => (
          <div className="kaelis-sidebar__section" key={section.label}>
            <span className="kaelis-sidebar__section-label">{section.label}</span>
            {section.items.map((item) => {
              if (item.comingSoon) {
                return (
                  <div
                    key={item.href}
                    className="kaelis-sidebar__link kaelis-sidebar__link--disabled"
                    aria-disabled="true"
                  >
                    <NavIcon name={item.icon} />
                    {item.label}
                    <span className="kaelis-coming-soon-badge">Coming soon</span>
                  </div>
                );
              }

              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`kaelis-sidebar__link${isActive ? ' kaelis-sidebar__link--active' : ''}`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
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

function NavIcon({ name }: { name: string }) {
  // Single shared glyph set kept intentionally simple (line icons, no emoji) --
  // each nav item gets a distinct but visually consistent mark.
  const paths: Record<string, string> = {
    dashboard: 'M4 4h6v6H4zM12 4h6v6h-6zM4 12h6v6H4zM12 12h6v6h-6z',
    distributions: 'M10 2v16M2 10h16',
    claims: 'M4 4h12v14l-6-3-6 3z',
    faucet: 'M10 2 L15 9 C15 12 12.8 15 10 15 C7.2 15 5 12 5 9 Z',
    vesting: 'M3 15l4-5 4 3 6-8',
    payroll: 'M3 6h14v10H3zM3 9h14',
    grants: 'M10 2l2.5 5.5L18 9l-4.5 4L14.5 18 10 15l-4.5 3 1-5L2 9l5.5-1.5z',
    overview: 'M3 13l4-6 4 3 6-8',
    reports: 'M5 3h10v14H5zM8 7h4M8 10h4M8 13h2',
    team: 'M7 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM13 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 16c0-2.8 2.2-5 5-5s5 2.2 5 5M11 11.5c2.2.4 4 2.2 4 4.5',
    settings:
      'M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10 2v2.2M10 15.8V18M4.2 4.2l1.6 1.6M14.2 14.2l1.6 1.6M2 10h2.2M15.8 10H18M4.2 15.8l1.6-1.6M14.2 5.8l1.6-1.6',
  };

  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={paths[name] ?? paths.dashboard} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
      }
    
