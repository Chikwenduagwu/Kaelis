interface ActivityChartProps {
  distributionCount: number;
  recipientCount: number;
  isLoading?: boolean;
}

/**
 * Visual "Distribution Activity" card matching the dashboard reference design.
 *
 * Deliberately does NOT plot a time series with dates on the x-axis. The only real
 * on-chain data available (via campaignCount()/getCampaign() reads -- see
 * ARCHITECTURE.md for why this app doesn't use eth_getLogs) is current totals, not a
 * per-day history: there is no per-day event index to plot truthfully without
 * re-introducing the getLogs block-range problems that broke this page on the free
 * RPC tier. Rather than fabricate a plausible-looking trend line with invented daily
 * values (which would be exactly the kind of mock data the project's own hackathon
 * rules explicitly forbid), this renders the two real totals as a simple proportional
 * bar comparison, labeled "All time" -- honest about what it represents while still
 * visually matching the reference's chart-card layout and color legend.
 */
export function ActivityChart({ distributionCount, recipientCount, isLoading }: ActivityChartProps) {
  const maxValue = Math.max(distributionCount, recipientCount, 1);
  const distributionPct = (distributionCount / maxValue) * 100;
  const recipientPct = (recipientCount / maxValue) * 100;

  return (
    <div className="kaelis-card kaelis-activity-chart">
      <div className="kaelis-card__header">
        <h2>Distribution Activity</h2>
        <div className="kaelis-activity-chart__legend">
          <span className="kaelis-activity-chart__legend-item">
            <span className="kaelis-activity-chart__dot kaelis-activity-chart__dot--gold" />
            Distributions
          </span>
          <span className="kaelis-activity-chart__legend-item">
            <span className="kaelis-activity-chart__dot kaelis-activity-chart__dot--green" />
            Recipients
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="kaelis-skeleton-row" style={{ height: 120 }} />
      ) : (
        <div className="kaelis-activity-chart__bars">
          <div className="kaelis-activity-chart__bar-row">
            <span className="kaelis-activity-chart__bar-label">Distributions</span>
            <div className="kaelis-activity-chart__bar-track">
              <div
                className="kaelis-activity-chart__bar-fill kaelis-activity-chart__bar-fill--gold"
                style={{ width: `${distributionPct}%` }}
              />
            </div>
            <span className="kaelis-activity-chart__bar-value">{distributionCount}</span>
          </div>
          <div className="kaelis-activity-chart__bar-row">
            <span className="kaelis-activity-chart__bar-label">Recipients</span>
            <div className="kaelis-activity-chart__bar-track">
              <div
                className="kaelis-activity-chart__bar-fill kaelis-activity-chart__bar-fill--green"
                style={{ width: `${recipientPct}%` }}
              />
            </div>
            <span className="kaelis-activity-chart__bar-value">{recipientCount}</span>
          </div>
        </div>
      )}

      <span className="kaelis-activity-chart__footnote">All time</span>
    </div>
  );
}
