'use client';

/**
 * Hero-right illustration: a premium "confidential chip" with animated gold rails
 * flowing behind it and small particles traveling along them -- evoking encrypted
 * data moving through protected hardware (TEEs), per the brief. Pure SVG + CSS
 * transform/opacity animation, no raster assets, no emoji.
 */
export function ConfidentialChip() {
  const railCount = 7;
  const rails = Array.from({ length: railCount }, (_, i) => i);

  return (
    <div className="kaelis-chip">
      <svg
        className="kaelis-chip__rails"
        viewBox="0 0 480 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {rails.map((i) => {
          const y = 60 + i * 52;
          const delay = i * 0.9;
          return (
            <g key={i}>
              <line
                x1="0"
                y1={y}
                x2="480"
                y2={y}
                stroke="var(--kaelis-line)"
                strokeWidth="1"
              />
              <circle
                r="3"
                fill="var(--kaelis-gold)"
                className="kaelis-chip__particle"
                style={{ animationDelay: `${delay}s` }}
              >
                <animateMotion
                  dur="5.5s"
                  repeatCount="indefinite"
                  path={`M0,${y} L480,${y}`}
                  begin={`${delay}s`}
                />
              </circle>
            </g>
          );
        })}
      </svg>

      <svg
        className="kaelis-chip__core"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Confidential compute chip"
      >
        <rect
          x="40"
          y="40"
          width="120"
          height="120"
          rx="18"
          fill="url(#chipGradient)"
          stroke="var(--kaelis-gold)"
          strokeWidth="1.5"
        />
        <rect
          x="66"
          y="66"
          width="68"
          height="68"
          rx="10"
          fill="none"
          stroke="var(--kaelis-gold-bright)"
          strokeWidth="1"
          opacity="0.6"
        />
        {/* chip pins */}
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x={56 + i * 22} y="24" width="10" height="16" rx="2" fill="var(--kaelis-gold)" />
            <rect x={56 + i * 22} y="160" width="10" height="16" rx="2" fill="var(--kaelis-gold)" />
            <rect x="24" y={56 + i * 22} width="16" height="10" rx="2" fill="var(--kaelis-gold)" />
            <rect x="160" y={56 + i * 22} width="16" height="10" rx="2" fill="var(--kaelis-gold)" />
          </g>
        ))}
        {/* K mark */}
        <path
          d="M92 76 L92 124 M92 100 L118 76 M98 102 L118 124"
          stroke="var(--kaelis-ink)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="chipGradient" x1="40" y1="40" x2="160" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="var(--kaelis-gold-wash)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
