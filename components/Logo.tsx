export function Logo({ tagline = false }: { tagline?: boolean }) {
  return (
    <span className="logo">
      <span className="logo-mark" aria-hidden="true">PK</span>
      <span>
        <span className="logo-word">Politika Kosovare</span>
        {tagline && <span className="logo-tag">Lajme nga Kosova dhe bota</span>}
      </span>
    </span>
  );
}
