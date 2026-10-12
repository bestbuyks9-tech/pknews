"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase, roleLabel, type Profile } from "@/lib/browser";

export default function Team({ me }: { me: Profile }) {
  const [people, setPeople] = useState<Profile[] | null>(null);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "editor" as Profile["role"] });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("user_id,email,display_name,role").order("created_at");
    setPeople((data as Profile[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function call(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke("team", { body });
    if (error) {
      let text = error.message;
      try { const j = await (error as { context?: Response }).context?.json(); if (j?.error) text = j.error; } catch {}
      throw new Error(text);
    }
    return data;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      await call({ action: "create", ...form });
      setMsg({ kind: "ok", text: `${form.name || form.email} u shtua. Dërgoji email-in dhe fjalëkalimin — mund të hyjë në /studio menjëherë.` });
      setForm({ email: "", name: "", password: "", role: "editor" });
      load();
    } catch (err) { setMsg({ kind: "err", text: (err as Error).message }); }
    setBusy(false);
  }

  async function changeRole(p: Profile, role: Profile["role"]) {
    const { error } = await supabase.from("profiles").update({ role }).eq("user_id", p.user_id);
    if (error) setMsg({ kind: "err", text: error.message }); else load();
  }

  async function removeUser(p: Profile) {
    if (!confirm(`Ta heq aksesin për ${p.display_name || p.email}? Postimet e tyre mbeten.`)) return;
    try { await call({ action: "remove", user_id: p.user_id }); load(); } catch (err) { setMsg({ kind: "err", text: (err as Error).message }); }
  }

  const gen = () => setForm((f) => ({ ...f, password: Array.from(crypto.getRandomValues(new Uint8Array(9))).map((n) => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 56]).join("") + "!7" }));

  return (
    <div className="st-page">
      <div className="st-head"><div><h1>Ekipi</h1><p className="muted">Shto gazetarë dhe vendos çfarë mund të bëjnë.</p></div></div>
      <div className="team-grid">
        <form className="team-add" onSubmit={add}>
          <h3>Shto anëtar</h3>
          <label>Emri<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="p.sh. Arta Krasniqi" required /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Fjalëkalimi i përkohshëm
            <div className="row"><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /><button type="button" className="st-btn ghost" onClick={gen}>Gjenero</button></div>
          </label>
          <label>Roli
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Profile["role"] })}>
              <option value="editor">Gazetar — shkruan, dërgon për rishikim</option>
              <option value="manager">Kryeredaktor — publikon dhe fshin</option>
              <option value="admin">Administrator — gjithçka + ekipi</option>
            </select>
          </label>
          <button className="st-btn primary" disabled={busy}>{busy ? "Duke shtuar…" : "Shto në ekip"}</button>
          {msg && <p className={msg.kind === "ok" ? "st-ok" : "st-error"}>{msg.text}</p>}
        </form>
        <ul className="team-list">
          {(people ?? []).map((p) => (
            <li key={p.user_id}>
              <span className="st-avatar">{(p.display_name || p.email || "?").slice(0, 1).toUpperCase()}</span>
              <div><strong>{p.display_name || "—"}</strong><small>{p.email}</small></div>
              {p.user_id === me.user_id ? <span className="st-badge published">{roleLabel(p.role)} (ti)</span> : (
                <>
                  <select value={p.role} onChange={(e) => changeRole(p, e.target.value as Profile["role"])}>
                    <option value="editor">Gazetar</option><option value="manager">Kryeredaktor</option><option value="admin">Administrator</option>
                  </select>
                  <button className="st-link danger" onClick={() => removeUser(p)}>Hiq</button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
