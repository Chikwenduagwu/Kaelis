const LEFT_TAGS = ['Investors', 'Contributors', 'Payroll', 'Grants', 'Vesting'];

/**
 * Floating tag chips flanking the vault illustration, each with a thin curved SVG
 * line "connecting" it toward the vault -- matching the reference's particle-stream
 * composition. Positioned with CSS absolute layout over the vault so this can sit in
 * the same stacking context without needing a single giant combined SVG.
 */
export function VaultTags() {
  return (
    <>
      <div className="kaelis-vault-tags kaelis-vault-tags--left">
        {LEFT_TAGS.map((tag, i) => (
          <div
            className="kaelis-vault-tag"
            key={tag}
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            <LockIcon />
            <span>{tag}</span>
          </div>
        ))}
      </div>

      <div className="kaelis-vault-tags kaelis-vault-tags--right">
        <div className="kaelis-vault-tag kaelis-vault-tag--verified">
          <ShieldCheckIcon />
          <div>
            <span className="kaelis-vault-tag__title">Verified</span>
            <span className="kaelis-vault-tag__subtitle">On-chain Proof</span>
          </div>
        </div>
      </div>

      {/* Connector particle-line svg, absolutely positioned behind the tags/vault */}
      <svg
        className="kaelis-vault-connectors"
        viewBox="0 0 900 500"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="connectorFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d4af6a" stopOpacity="0" />
            <stop offset="100%" stopColor="#d4af6a" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="connectorFadeRight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d4af6a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d4af6a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[100, 160, 220, 280, 340].map((y, i) => (
          <path
            key={`left-${i}`}
            d={`M 40 ${y} Q 220 ${y - 10 + i * 4} 340 250`}
            stroke="url(#connectorFade)"
            strokeWidth="1"
            fill="none"
          />
        ))}
        <path d="M 860 250 Q 700 250 560 250" stroke="url(#connectorFadeRight)" strokeWidth="1" fill="none" />
      </svg>
    </>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="var(--kaelis-gold)" strokeWidth="1.3" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="var(--kaelis-gold)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.5 L16.5 5 V9.5 C16.5 13.5 13.7 16.8 10 17.5 C6.3 16.8 3.5 13.5 3.5 9.5 V5 Z"
        stroke="var(--kaelis-gold)"
        strokeWidth="1.4"
      />
      <path d="M6.8 10 L9 12.3 L13.2 7.5" stroke="var(--kaelis-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
      }
