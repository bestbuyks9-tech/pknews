"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Reel } from "@/lib/reels";
import { SITE } from "@/lib/site";

// Shown until the first real Reels are in the database, so the page already looks and swipes like the finished feed.
const PLACEHOLDERS: Reel[] = [
  { year: "1878", title: "Histori e re së shpejti", question: "Rrëshqit lart për historinë tjetër." },
  { year: "1912", title: "Çdo ditë, dy histori shqiptare", question: "Video të shkurtra për ngjarjet që ndërtuan Kosovën dhe Shqipërinë." },
  { year: "1999", title: "Ndiqni Politika Kosovare", question: "Videot e para po vijnë. Rikthehuni së shpejti." },
].map((p, i) => ({
  id: `placeholder-${i}`, slug: `placeholder-${i}`, title: p.title, question: p.question, caption: p.year,
  video_url: "", poster_url: null, duration_s: null, facebook_url: null, published_at: "",
}));

/** Full-screen vertical feed: one Reel per screen, snap-scroll or swipe to the next, only the visible one plays. */
export function ReelFeed({ reels: data }: { reels: Reel[] }) {
  const placeholder = data.length === 0;
  const reels = placeholder ? PLACEHOLDERS : data;
  const feed = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Open at #slug when shared.
  useEffect(() => {
    const slug = decodeURIComponent(location.hash.slice(1));
    const i = reels.findIndex((r) => r.slug === slug);
    if (i > 0) feed.current?.children[i]?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
  }, [reels]);

  // The reel that fills most of the screen is the active one.
  useEffect(() => {
    const root = feed.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { root, threshold: 0.6 },
    );
    Array.from(root.children).forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reels]);

  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.muted = muted;
        v.play().catch(() => {
          // Browsers refuse sound before a tap; fall back to muted autoplay.
          v.muted = true;
          setMuted(true);
          v.play().catch(() => setPaused(true));
        });
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
    setPaused(false);
    setOpen(null);
    const r = reels[active];
    if (!r?.video_url) return;
    if (active > 0) history.replaceState(null, "", `#${r.slug}`);
    else history.replaceState(null, "", location.pathname);
  }, [active, reels]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const v = videos.current[active];
    if (v) v.muted = muted;
  }, [muted, active]);

  const go = useCallback((step: number) => {
    const el = feed.current?.children[active + step];
    el?.scrollIntoView({ behavior: "smooth" });
  }, [active]);

  const toggle = useCallback(() => {
    const v = videos.current[active];
    if (!v) return;
    if (muted) { setMuted(false); if (!v.paused) return; }
    if (v.paused) { v.play().catch(() => {}); setPaused(false); } else { v.pause(); setPaused(true); }
  }, [active, muted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); go(-1); }
      else if (e.key === " ") { e.preventDefault(); toggle(); }
      else if (e.key === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggle]);

  async function share(r: Reel) {
    const url = `${SITE.url}/histori#${r.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: r.title, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  return (
    <main className="reels-page">
      <header className="reels-top">
        <Link href="/" aria-label="Politika Kosovare, ballina" className="reels-home"><span className="logo-mark" aria-hidden="true">PK</span></Link>
        <h1>Histori</h1>
      </header>

      {(
        <div className="reels" ref={feed}>
          {reels.map((r, i) => {
            const near = Math.abs(i - active) <= 1;
            return (
              <section key={r.id} className="reel" data-i={i} id={r.slug} aria-label={r.title}>
                {r.poster_url && <div className="reel-bg" style={{ backgroundImage: `url(${r.poster_url})` }} aria-hidden="true" />}
                <div className="reel-frame">
                  {placeholder ? (
                    <div className={`reel-ph reel-ph-${i}`}>
                      <span className="reel-ph-tag">Së shpejti</span>
                      <b>{r.caption}</b>
                    </div>
                  ) : (<>
                  <video
                    ref={(el) => { videos.current[i] = el; }}
                    src={near ? r.video_url : undefined}
                    poster={r.poster_url ?? undefined}
                    preload={i === active ? "auto" : near ? "metadata" : "none"}
                    playsInline
                    loop
                    muted
                    onClick={toggle}
                    onTimeUpdate={(e) => {
                      const v = e.currentTarget;
                      const bar = v.parentElement?.querySelector<HTMLElement>(".reel-progress i");
                      if (bar && v.duration) bar.style.transform = `scaleX(${v.currentTime / v.duration})`;
                    }}
                  />
                  {i === active && paused && <button className="reel-play" onClick={toggle} aria-label="Luaj">▶</button>}
                  {i === active && muted && !paused && (
                    <button className="reel-sound-hint" onClick={() => setMuted(false)}>🔇 Prek për zë</button>
                  )}
                  </>)}

                  <div className={`reel-info${placeholder ? " full" : ""}`}>
                    <h2>{r.title}</h2>
                    {r.question && <p className="reel-q">{r.question}</p>}
                    {r.caption && !placeholder && (
                      <>
                        <p className={`reel-caption${open === r.id ? " open" : ""}`}>{r.caption}</p>
                        <button className="reel-more" onClick={() => setOpen(open === r.id ? null : r.id)}>
                          {open === r.id ? "Më pak" : "Më shumë"}
                        </button>
                      </>
                    )}
                  </div>

                  {!placeholder && <div className="reel-actions">
                    <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Ndiz zërin" : "Fik zërin"}>
                      <span>{muted ? "🔇" : "🔊"}</span><small>Zëri</small>
                    </button>
                    <button onClick={() => share(r)} aria-label="Shpërnda">
                      <span>↗</span><small>{copied && i === active ? "U kopjua" : "Shpërnda"}</small>
                    </button>
                    {r.facebook_url && (
                      <a href={r.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Komento në Facebook">
                        <span>💬</span><small>Komento</small>
                      </a>
                    )}
                  </div>}

                  <div className="reel-progress" aria-hidden="true"><i /></div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {reels.length > 1 && (
        <nav className="reels-nav" aria-label="Lëviz">
          <button onClick={() => go(-1)} disabled={active === 0} aria-label="E mëparshmja">↑</button>
          <button onClick={() => go(1)} disabled={active === reels.length - 1} aria-label="Tjetra">↓</button>
        </nav>
      )}
    </main>
  );
}
