interface StatCardProps {
  label: string;
  value: string;
  sublabel: string;
  icon: 'distributions' | 'claimed' | 'value' | 'active';
  isLoading?: boolean;
  badge?: 'trend-up' | 'active-dot' | 'hidden';
}

/**
 * Collapsed, full-width row layout (icon left, label/value stacked center, badge
 * right) instead of a boxed grid tile -- each stat spans the full page width as its
 * own row in a stacked list, per the "collapsed version, 100% width" direction.
 */
export function StatCard({ label, value, sublabel, icon, isLoading, badge }: StatCardProps) {
  return (
    <div className="kaelis-stat-row">
      <div className="kaelis-stat-row__icon">
        <StatIcon name={icon} />
      </div>
      <div className="kaelis-stat-row__body">
        <span className="kaelis-stat-row__label">{label}</span>
        {isLoading ? (
          <span className="kaelis-stat-row__skeleton" aria-label="Loading" />
        ) : (
          <span className="kaelis-stat-row__value">{value}</span>
        )}
        <span className="kaelis-stat-row__sublabel">{sublabel}</span>
      </div>
      {badge && (
        <div className={`kaelis-stat-row__badge kaelis-stat-row__badge--${badge}`}>
          <BadgeIcon name={badge} />
        </div>
      )}
    </div>
  );
}

function StatIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    distributions: 'M4 4h6v6H4zM12 4h6v6h-6zM4 12h6v6H4zM12 12h6v6h-6z',
    claimed: 'M5 3h10a1 1 0 0 1 1 1v13l-6-3-6 3V4a1 1 0 0 1 1-1z',
    value: 'M10 2v16M6 6h5.5a2.5 2.5 0 0 1 0 5H8a2.5 2.5 0 0 0 0 5h6',
    active: 'M2 10h4l2-6 4 12 2-6h4',
  };
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={paths[name]} stroke="var(--kaelis-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BadgeIcon({ name }: { name: 'trend-up' | 'active-dot' | 'hidden' }) {
  if (name === 'active-dot') {
    return (
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
        <circle cx="4" cy="4" r="4" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'hidden') {
    return (
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M3 3l14 14M9.5 9.5a1.5 1.5 0 0 0 2.1 2.1M7 5.5A8.4 8.4 0 0 1 10 5c4 0 7 3 8 5-.4.8-1.2 2-2.4 3.1M5.4 6.9C4.2 8 3.4 9.2 3 10c1 2 4 5 8 5a8.2 8.2 0 0 0 2.5-.4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 13l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 6h3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
