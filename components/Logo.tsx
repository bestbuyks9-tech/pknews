export function OrbitMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="orbit-mark">
      <defs>
        <linearGradient id="og" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7cf5d1" />
          <stop offset="1" stopColor="#9d8cff" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="7" fill="url(#og)" />
      <ellipse cx="20" cy="20" rx="17" ry="7.5" fill="none" stroke="url(#og)" strokeWidth="1.6" transform="rotate(-28 20 20)" opacity=".9" />
      <circle className="orbit-dot" cx="35" cy="12" r="2.4" fill="#eef1f6" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <OrbitMark />
      <span className="logo-word">orbita</span>
    </span>
  );
}
