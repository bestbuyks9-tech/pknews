"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { CATEGORIES, category, timeAgo, type Post } from "@/lib/site";
import { supabase, roleLabel, type Profile } from "@/lib/browser";
import { Logo } from "@/components/Logo";
import Editor from "./Editor";
import Team from "./Team";

type View = { kind: "list" } | { kind: "edit"; id: string | null } | { kind: "team" };

const STATUS_LABEL: Record<Post["status"], string> = { draft: "Draft", review: "Për rishikim", published: "Publikuar" };

export default function Studio() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>({ kind: "list" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    supabase.from("profiles").select("user_id,email,display_name,role").eq("user_id", session.user.id).single()
      .then(({ data }) => setProfile((data as Profile) ?? null));
  }, [session]);

  if (!ready) return <div className="st-center"><span className="st-spinner" /></div>;
  if (!session) return <Login />;
  if (!profile) return <div className="st-center"><span className="st-spinner" /></div>;

  return (
    <div className="st-shell">
      <aside className="st-side">
        <a href="/" className="st-logo"><Logo /><small>Studio</small></a>
        <button className="st-new" onClick={() => setView({ kind: "edit", id: null })}>＋ Postim i ri</button>
        <nav>
          <button className={view.kind === "list" ? "on" : ""} onClick={() => setView({ kind: "list" })}>Postimet</button>
          {profile.role === "admin" && <button className={view.kind === "team" ? "on" : ""} onClick={() => setView({ kind: "team" })}>Ekipi</button>}
          <a href="/" target="_blank">Shiko faqen ↗</a>
        </nav>
        <div className="st-me">
          <span className="st-avatar">{(profile.display_name || profile.email || "?").slice(0, 1).toUpperCase()}</span>
          <div><strong>{profile.display_name || profile.email}</strong><small>{roleLabel(profile.role)}</small></div>
          <button className="st-link" onClick={() => supabase.auth.signOut()}>Dil</button>
        </div>
      </aside>
      <main className="st-main">
        {view.kind === "list" && <PostList profile={profile} onOpen={(id) => setView({ kind: "edit", id })} onNew={() => setView({ kind: "edit", id: null })} />}
        {view.kind === "edit" && <Editor key={view.id ?? "new"} id={view.id} profile={profile} onClose={() => setView({ kind: "list" })} onSaved={(id) => setView({ kind: "edit", id })} />}
        {view.kind === "team" && <Team me={profile} />}
      </main>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="st-login">
      <div className="st-login-card">
        <Logo />
        <h1>Mirë se erdhe në Studio.</h1>
        <p className="muted">Hyr për të shkruar dhe publikuar lajme.</p>
        <form onSubmit={async (e) => {
          e.preventDefault(); setBusy(true); setMsg("");
          const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (error) setMsg("Email-i ose fjalëkalimi nuk është i saktë.");
          setBusy(false);
        }}>
          <label>Email<input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Fjalëkalimi<input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className="st-btn primary" disabled={busy}>{busy ? "Duke hyrë…" : "Hyr →"}</button>
          {msg && <p className="st-error">{msg}</p>}
        </form>
      </div>
    </div>
  );
}

function PostList({ profile, onOpen, onNew }: { profile: Profile; onOpen: (id: string) => void; onNew: () => void }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [filter, setFilter] = useState<"all" | Post["status"]>("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("posts").select("*").order("updated_at", { ascending: false }).limit(300);
    setPosts((data as Post[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => (posts ?? []).filter((p) =>
    (filter === "all" || p.status === filter) && (!q || p.title.toLowerCase().includes(q.toLowerCase()))), [posts, filter, q]);

  const counts = useMemo(() => {
    const c = { all: 0, draft: 0, review: 0, published: 0 };
    (posts ?? []).forEach((p) => { c.all++; c[p.status]++; });
    return c;
  }, [posts]);

  return (
    <div className="st-page">
      <div className="st-head">
        <div>
          <h1>Postimet</h1>
          <p className="muted">Mirë se erdhe, {profile.display_name || "redaktor"}. {counts.review > 0 && profile.role !== "editor" ? `${counts.review} postime presin rishikimin.` : ""}</p>
        </div>
        <button className="st-btn primary" onClick={onNew}>＋ Postim i ri</button>
      </div>
      <div className="st-toolbar">
        <div className="st-tabs">
          {(["all", "draft", "review", "published"] as const).map((f) => (
            <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
              {f === "all" ? "Të gjitha" : STATUS_LABEL[f]} <span>{counts[f]}</span>
            </button>
          ))}
        </div>
        <input className="st-search" placeholder="Kërko titullin…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {posts === null ? <div className="st-center small"><span className="st-spinner" /></div> : shown.length === 0 ? (
        <div className="st-empty">
          <p>{posts.length === 0 ? "Ende asnjë postim. Krijo të parin — zgjat më pak se një minutë." : "Asnjë postim nuk përputhet."}</p>
          {posts.length === 0 && <button className="st-btn primary" onClick={onNew}>Shkruaj lajmin e parë →</button>}
        </div>
      ) : (
        <ul className="st-list">
          {shown.map((p) => (
            <li key={p.id} onClick={() => onOpen(p.id)}>
              <div className="st-thumb" style={{ ["--hue" as string]: category(p.category).hue }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.cover_url ? <img src={p.cover_url} alt="" /> : null}
              </div>
              <div className="st-li-main">
                <strong>{p.title || "Pa titull"}</strong>
                <small>{category(p.category).label} · {p.author_name || "—"} · ndryshuar {timeAgo(p.updated_at)}</small>
              </div>
              {p.featured && <span className="st-badge feat">★ Kryesor</span>}
              <span className={`st-badge ${p.status}`}>{STATUS_LABEL[p.status]}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="st-hint muted">Rubrikat: {CATEGORIES.map((c) => c.label).join(" · ")}</p>
    </div>
  );
}
