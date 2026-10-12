import Link from "next/link";
import { CATEGORIES, SITE } from "@/lib/site";
import { Logo } from "./Logo";

export function Header({ active }: { active?: string }) {
  const today = new Intl.DateTimeFormat("sq-AL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Belgrade" }).format(new Date());
  return (
    <header className="header">
      <div className="wrap header-row">
        <Link href="/" aria-label="Orbita, ballina"><Logo /></Link>
        <nav className="nav" aria-label="Rubrikat">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`} className={active === c.slug ? "on" : ""} style={{ ["--hue" as string]: c.hue }}>
              {c.label}
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <span className="today"><i className="pulse" />{today}</span>
          <form action="/kerko" className="search-mini" role="search">
            <input name="q" placeholder="Kërko…" aria-label="Kërko lajme" />
          </form>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <Logo />
            <p className="muted footer-tag">{SITE.tagline}.</p>
          </div>
          <div className="footer-links">
            {CATEGORIES.map((c) => <Link key={c.slug} href={`/${c.slug}`}>{c.label}</Link>)}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Orbita</span>
          <Link href="/studio">Studio ↗</Link>
        </div>
      </div>
    </footer>
  );
}
