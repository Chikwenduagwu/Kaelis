/**
 * VaultIllustration: a from-scratch SVG rendering of a premium white/gold vault with
 * a K-monogram dial, built to match the reference hero composition. Constructed as
 * three visible cube faces (top, front, right) each with their own linear gradient to
 * fake a consistent single light source from the upper-left, plus a soft radial glow
 * "ground shadow" beneath it and a thin gold dial with a K mark.
 *
 * No external image assets -- pure SVG gradients/shapes, so it's crisp at any size
 * and has zero network/load-time cost, unlike a raster hero image.
 */
export function VaultIllustration() {
  return (
    <svg
      viewBox="0 0 520 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="kaelis-vault-svg"
      role="img"
      aria-label="Illustration of a confidential vault"
    >
      <defs>
        <radialGradient id="vaultGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d4af6a" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#d4af6a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#d4af6a" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="vaultTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e5e2da" />
        </linearGradient>

        <linearGradient id="vaultFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbfaf7" />
          <stop offset="55%" stopColor="#eeece5" />
          <stop offset="100%" stopColor="#dcd8cd" />
        </linearGradient>

        <linearGradient id="vaultSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cdc9bd" />
          <stop offset="100%" stopColor="#b6b1a2" />
        </linearGradient>

        <linearGradient id="goldTrim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8c883" />
          <stop offset="50%" stopColor="#b08d3f" />
          <stop offset="100%" stopColor="#8f6f2c" />
        </linearGradient>

        <linearGradient id="dialFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3e2b8" />
          <stop offset="100%" stopColor="#b08d3f" />
        </linearGradient>

        <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" floodColor="#0a0a0a" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* Ground glow */}
      <ellipse cx="260" cy="430" rx="150" ry="34" fill="url(#vaultGlow)" />
      <ellipse cx="260" cy="430" rx="95" ry="18" fill="url(#vaultGlow)" />

      {/* Vault body group, drop-shadowed as one unit for a floating effect */}
      <g filter="url(#softShadow)">
        {/* Right (side) face */}
        <path d="M340 150 L400 185 L400 340 L340 375 Z" fill="url(#vaultSide)" />
        {/* Top face */}
        <path d="M150 150 L230 105 L400 150 L340 185 Z" fill="url(#vaultTop)" />
        {/* Front face */}
        <rect x="150" y="150" width="190" height="225" rx="10" fill="url(#vaultFront)" />

        {/* Front face gold border/trim */}
        <rect
          x="162"
          y="162"
          width="166"
          height="201"
          rx="6"
          fill="none"
          stroke="url(#goldTrim)"
          strokeWidth="3"
        />

        {/* Hinges (left edge of front face) */}
        <rect x="148" y="185" width="10" height="26" rx="3" fill="url(#goldTrim)" />
        <rect x="148" y="300" width="10" height="26" rx="3" fill="url(#goldTrim)" />

        {/* Vertical bolt bar along the right edge of the door, like a real safe */}
        <rect x="308" y="168" width="6" height="190" fill="url(#goldTrim)" opacity="0.85" />

        {/* K monogram, upper-left of the door */}
        <path
          d="M198 225 L198 275 M198 250 L222 225 M204 251 L222 275"
          stroke="#0a0a0a"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Combination dial, lower-right of the door */}
        <circle cx="278" cy="300" r="30" fill="url(#dialFace)" stroke="url(#goldTrim)" strokeWidth="2" />
        <circle cx="278" cy="300" r="21" fill="none" stroke="#0a0a0a" strokeWidth="1.5" opacity="0.35" />
        <circle cx="278" cy="300" r="5" fill="#0a0a0a" opacity="0.55" />
        {/* dial tick marks */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const x1 = 278 + Math.cos(angle) * 24;
          const y1 = 300 + Math.sin(angle) * 24;
          const x2 = 278 + Math.cos(angle) * 27;
          const y2 = 300 + Math.sin(angle) * 27;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#0a0a0a"
              strokeWidth="1"
              opacity="0.3"
            />
          );
        })}

        {/* Top face highlight streak, suggesting a light source upper-left */}
        <path d="M170 143 L230 112 L260 122 L200 152 Z" fill="#ffffff" opacity="0.5" />

        {/* Side face gold edge trim */}
        <path d="M340 150 L400 185 L400 190 L340 155 Z" fill="url(#goldTrim)" opacity="0.7" />
      </g>

      {/* Ambient floating particles near the vault, echoing the reference's sparkle */}
      {[
        [110, 260],
        [95, 300],
        [130, 340],
        [420, 240],
        [440, 290],
        [405, 330],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i % 2 === 0 ? 2.5 : 1.6} fill="#d4af6a" opacity="0.6" />
      ))}
    </svg>
  );
}
