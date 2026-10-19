import Link from "next/link";
import { CATEGORIES, type Post } from "@/lib/site";
import { Logo } from "./Logo";
import { Ad } from "./Ad";
import { LiveBar } from "./LiveBar";

function today() {
  return new Intl.DateTimeFormat("sq-AL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Belgrade" }).format(new Date());
}

export function Header({ active, breaking }: { active?: string; breaking?: Post[] }) {
  return (
    <>
      <a href="#main" className="skip">Kalo te përmbajtja</a>
      <div className="topbar">
        <div className="wrap">
          <span style={{ textTransform: "capitalize" }}>{today()}</span>
          <nav className="topbar-links" aria-label="Lidhje">
            <Link href="/kerko">Kërko</Link>
            <a href="mailto:reklama@politikakosovare.com">Reklamo te ne</a>
            <Link href="/studio">Redaksia</Link>
          </nav>
        </div>
      </div>
      <header className="masthead">
        <div className="wrap">
          <Link href="/" aria-label="Politika Kosovare, ballina"><Logo tagline /></Link>
          <Ad size="leaderboard" label={false} />
        </div>
      </header>
      <nav className="nav" aria-label="Rubrikat">
        <div className="wrap">
          <div className="nav-links">
            <Link href="/" className={!active ? "on" : ""}>Ballina</Link>
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} className={active === c.slug ? "on" : ""}>{c.label}</Link>
            ))}
            <Link href="/histori">▶ Histori</Link>
          </div>
          <form action="/kerko" className="nav-search" role="search">
            <input name="q" placeholder="Kërko lajme…" aria-label="Kërko lajme" />
          </form>
        </div>
      </nav>
      <LiveBar />
      {breaking && breaking.length > 0 && (
        <div className="ticker">
          <div className="wrap">
            <span className="ticker-label">Të fundit</span>
            <div className="ticker-track">
              <div className="ticker-move">
                {[...breaking, ...breaking].map((p, i) => (
                  <Link key={i} href={`/lajm/${p.slug}`} tabIndex={i >= breaking.length ? -1 : undefined}>{p.title}</Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <Logo />
            <p style={{ maxWidth: 360, margin: "12px 0 0" }}>Lajme nga Kosova dhe bota — të shpejta, të qarta dhe të verifikuara.</p>
          </div>
          <nav className="footer-links" aria-label="Rubrikat">
            {CATEGORIES.map((c) => <Link key={c.slug} href={`/${c.slug}`}>{c.label}</Link>)}
            <Link href="/histori">Histori</Link>
            <Link href="/kerko">Kërko</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Politika Kosovare. Të gjitha të drejtat e rezervuara.</span>
          <span><a href="mailto:reklama@politikakosovare.com">Reklama</a> · <Link href="/studio">Redaksia</Link></span>
        </div>
      </div>
    </footer>
  );
}
