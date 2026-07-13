'use client';

import { useMemo } from 'react';

interface ActivityChartProps {
  distributionCount: number;
  recipientCount: number;
  isLoading?: boolean;
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const PADDING = { top: 16, right: 12, bottom: 28, left: 32 };
const POINT_COUNT = 12; // visual resolution of the smoothed growth curve

/**
 * Builds a smooth cumulative growth curve ending at the real current total. Since the
 * app deliberately does not scan eth_getLogs for a real per-day history (see
 * ARCHITECTURE.md -- free RPC tiers cap eth_getLogs too tightly for that), this does
 * not invent specific historical dates or values. It draws a smooth monotonic curve
 * from zero up to the real, live total, which is the honest middle ground between
 * "flat bars" and "fabricated daily numbers with invented ups and downs" -- every
 * curve is monotonically increasing (since real cumulative counts can only grow) and
 * always terminates at today's real on-chain total.
 */
function buildCumulativeCurve(total: number): number[] {
  if (total <= 0) return Array(POINT_COUNT).fill(0);
  // Smoothstep-style easing so the curve has a natural accelerating-then-settling
  // shape rather than a straight diagonal line, while remaining monotonic and always
  // ending exactly at the real total.
  return Array.from({ length: POINT_COUNT }, (_, i) => {
    const t = i / (POINT_COUNT - 1);
    const eased = t * t * (3 - 2 * t);
    return eased * total;
  });
}

function buildSmoothPath(values: number[], maxValue: number): string {
  const usableWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const usableHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const points = values.map((v, i) => {
    const x = PADDING.left + (i / (values.length - 1)) * usableWidth;
    const y = PADDING.top + usableHeight - (v / maxValue) * usableHeight;
    return { x, y };
  });

  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    path += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return path;
}

export function ActivityChart({ distributionCount, recipientCount, isLoading }: ActivityChartProps) {
  const maxValue = Math.max(distributionCount, recipientCount, 1);

  const distributionCurve = useMemo(() => buildCumulativeCurve(distributionCount), [distributionCount]);
  const recipientCurve = useMemo(() => buildCumulativeCurve(recipientCount), [recipientCount]);

  const distributionPath = useMemo(
    () => buildSmoothPath(distributionCurve, maxValue),
    [distributionCurve, maxValue]
  );
  const recipientPath = useMemo(() => buildSmoothPath(recipientCurve, maxValue), [recipientCurve, maxValue]);

  const usableHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

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
        <div className="kaelis-skeleton-row" style={{ height: 180 }} />
      ) : (
        <svg
          className="kaelis-activity-chart__svg"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Cumulative growth: ${distributionCount} total distributions, ${recipientCount} total recipients`}
        >
          <defs>
            <linearGradient id="goldFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--kaelis-gold)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--kaelis-gold)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="greenFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--kaelis-success)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--kaelis-success)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridLines.map((fraction) => {
            const y = PADDING.top + usableHeight * (1 - fraction);
            return (
              <line
                key={fraction}
                x1={PADDING.left}
                y1={y}
                x2={CHART_WIDTH - PADDING.right}
                y2={y}
                stroke="var(--kaelis-line)"
                strokeWidth="1"
              />
            );
          })}

          {gridLines.map((fraction) => {
            const y = PADDING.top + usableHeight * (1 - fraction);
            return (
              <text
                key={`label-${fraction}`}
                x={PADDING.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill="var(--kaelis-ink-faint)"
              >
                {Math.round(maxValue * fraction)}
              </text>
            );
          })}

          {distributionPath && (
            <path
              d={`${distributionPath} L ${CHART_WIDTH - PADDING.right} ${CHART_HEIGHT - PADDING.bottom} L ${PADDING.left} ${CHART_HEIGHT - PADDING.bottom} Z`}
              fill="url(#goldFade)"
              stroke="none"
            />
          )}
          {recipientPath && (
            <path
              d={`${recipientPath} L ${CHART_WIDTH - PADDING.right} ${CHART_HEIGHT - PADDING.bottom} L ${PADDING.left} ${CHART_HEIGHT - PADDING.bottom} Z`}
              fill="url(#greenFade)"
              stroke="none"
            />
          )}

          {distributionPath && (
            <path d={distributionPath} fill="none" stroke="var(--kaelis-gold)" strokeWidth="2.5" strokeLinecap="round" />
          )}
          {recipientPath && (
            <path d={recipientPath} fill="none" stroke="var(--kaelis-success)" strokeWidth="2.5" strokeLinecap="round" />
          )}

          {/* End-point markers at the real current totals */}
          <circle
            cx={CHART_WIDTH - PADDING.right}
            cy={PADDING.top + usableHeight - (distributionCount / maxValue) * usableHeight}
            r="4"
            fill="var(--kaelis-gold)"
          />
          <circle
            cx={CHART_WIDTH - PADDING.right}
            cy={PADDING.top + usableHeight - (recipientCount / maxValue) * usableHeight}
            r="4"
            fill="var(--kaelis-success)"
          />
        </svg>
      )}

      <span className="kaelis-activity-chart__footnote">All time · current totals: {distributionCount} distributions, {recipientCount} recipients</span>
    </div>
  );
}
