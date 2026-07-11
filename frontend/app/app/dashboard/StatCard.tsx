interface StatCardProps {
  label: string;
  value: string;
  sublabel: string;
  icon: 'distributions' | 'claimed' | 'value' | 'active';
  isLoading?: boolean;
}

export function StatCard({ label, value, sublabel, icon, isLoading }: StatCardProps) {
  return (
    <div className="kaelis-stat-card">
      <div className="kaelis-stat-card__icon">
        <StatIcon name={icon} />
      </div>
      <div className="kaelis-stat-card__body">
        <span className="kaelis-stat-card__label">{label}</span>
        {isLoading ? (
          <span className="kaelis-stat-card__skeleton" aria-label="Loading" />
        ) : (
          <span className="kaelis-stat-card__value">{value}</span>
        )}
        <span className="kaelis-stat-card__sublabel">{sublabel}</span>
      </div>
    </div>
  );
}

function StatIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    distributions: 'M4 4h6v6H4zM12 4h6v6h-6zM4 12h6v6H4zM12 12h6v6h-6z',
    claimed: 'M4 4h12v14l-6-3-6 3z',
    value: 'M10 2v16M6 6h5.5a2.5 2.5 0 0 1 0 5H8a2.5 2.5 0 0 0 0 5h6',
    active: 'M2 10h4l2-6 4 12 2-6h4',
  };
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={paths[name]} stroke="var(--kaelis-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
