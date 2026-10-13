export function Logo({ tagline = false }: { tagline?: boolean }) {
  return (
    <span className="logo">
      <span className="logo-mark" aria-hidden="true">O</span>
      <span>
        <span className="logo-word">Orbita</span>
        {tagline && <span className="logo-tag">Lajme nga Kosova dhe bota</span>}
      </span>
    </span>
  );
}
