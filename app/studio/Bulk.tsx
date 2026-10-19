"use client";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, category, slugify } from "@/lib/site";
import { supabase, type Profile } from "@/lib/browser";
import { uploadCover } from "@/lib/media";

/** One article from the sheet, waiting for its picture and then posted on its own. */
type Row = {
  key: string;
  category: string;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  state: "idle" | "uploading" | "posting" | "done" | "error";
  msg?: string;
  slug?: string;
};

const STORE = "pk_bulk_rows";
const COLUMNS: Record<keyof Pick<Row, "category" | "title" | "excerpt" | "body">, string[]> = {
  category: ["category", "kategoria", "kategori", "rubrika", "rubrik"],
  title: ["title", "titulli", "titull", "headline"],
  excerpt: ["excerpt", "summary", "permbledhja", "permbledhje", "lead", "nentitulli"],
  body: ["body", "content", "teksti", "tekst", "permbajtja", "lajmi", "article"],
};
const TEMPLATE = `kategoria,titulli,permbledhja,teksti
Kosova,"Titulli i lajmit këtu","Një fjali e shkurtër që përmbledh lajmin.","Paragrafi i parë i lajmit.

Paragrafi i dytë i lajmit."
`;

const fold = (s: string) => s.toLowerCase().replace(/ë/g, "e").replace(/ç/g, "c").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");

/** Parses CSV or TSV (as pasted from a spreadsheet), with quoted fields that may hold commas and line breaks. */
function parseSheet(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = firstLine.includes("\t") ? "\t" : (firstLine.split(";").length > firstLine.split(",").length ? ";" : ",");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function toCategory(v: string) {
  const f = fold(v);
  return CATEGORIES.find((c) => fold(c.slug) === f || fold(c.label) === f)?.slug ?? null;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain text becomes paragraphs; text that already has HTML tags is kept as it is. */
function toHtml(body: string) {
  if (/<\/?(p|h2|h3|ul|ol|li|blockquote|strong|em|a)\b/i.test(body)) return body;
  const parts = body.includes("\n\n") ? body.split(/\n\s*\n/) : body.split(/\n/);
  return parts.map((p) => p.trim()).filter(Boolean).map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
}

function rowsFromSheet(text: string): { rows: Row[]; warnings: string[] } {
  const table = parseSheet(text.replace(/^﻿/, ""));
  if (table.length === 0) return { rows: [], warnings: ["Skedari është bosh."] };
  const head = table[0].map(fold);
  const idx = Object.fromEntries(Object.entries(COLUMNS).map(([k, names]) => [k, head.findIndex((h) => names.includes(h))])) as Record<keyof typeof COLUMNS, number>;
  const hasHeader = idx.title >= 0;
  if (!hasHeader) Object.assign(idx, { category: 0, title: 1, excerpt: 2, body: 3 });
  const warnings: string[] = [];
  const rows = (hasHeader ? table.slice(1) : table).map((r, i): Row | null => {
    const get = (k: keyof typeof COLUMNS) => (idx[k] >= 0 ? (r[idx[k]] ?? "").trim() : "");
    const title = get("title");
    if (!title) return null;
    const raw = get("category");
    const cat = toCategory(raw);
    if (raw && !cat) warnings.push(`Rreshti ${i + 1}: rubrika “${raw}” nuk njihet, u vendos Kosova.`);
    return { key: crypto.randomUUID(), category: cat ?? "kosova", title, excerpt: get("excerpt"), body: get("body"), cover_url: null, state: "idle" };
  }).filter((r): r is Row => r !== null);
  if (!hasHeader) warnings.unshift("Nuk u gjet rreshti i titujve; kolonat u lexuan si: kategoria, titulli, përmbledhja, teksti.");
  return { rows, warnings };
}

export default function Bulk({ profile }: { profile: Profile }) {
  const canPublish = profile.role !== "editor";
  const [rows, setRows] = useState<Row[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [paste, setPaste] = useState("");
  const [running, setRunning] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try { const saved = localStorage.getItem(STORE); if (saved) setRows(JSON.parse(saved)); } catch { /* nothing saved */ }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(STORE, JSON.stringify(rows.map((r) => (r.state === "uploading" || r.state === "posting" ? { ...r, state: "idle" } : r)))); } catch { /* storage full or blocked */ }
  }, [rows]);

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  function load(text: string) {
    const { rows: next, warnings: w } = rowsFromSheet(text);
    setWarnings(next.length ? w : [...w, "Nuk u gjet asnjë lajm me titull."]);
    if (next.length) setRows((rs) => [...rs.filter((r) => r.state !== "done"), ...next]);
  }

  async function pick(row: Row, file: File) {
    patch(row.key, { state: "uploading", msg: undefined });
    try { patch(row.key, { cover_url: await uploadCover(file), state: "idle" }); }
    catch (e) { patch(row.key, { state: "error", msg: (e as Error).message }); }
  }

  async function post(row: Row) {
    if (!row.title.trim()) { patch(row.key, { state: "error", msg: "Mungon titulli." }); return false; }
    patch(row.key, { state: "posting", msg: undefined });
    const status = canPublish ? "published" : "review";
    const base = slugify(row.title) || crypto.randomUUID().slice(0, 8);
    const record = {
      title: row.title.trim(), excerpt: row.excerpt.trim(), body: toHtml(row.body), category: row.category,
      cover_url: row.cover_url, cover_alt: "", featured: false, status,
      published_at: status === "published" ? new Date().toISOString() : null,
      author_id: profile.user_id, author_name: profile.display_name || profile.email || "Redaksia",
    };
    for (const slug of [base, `${base.slice(0, 74)}-${crypto.randomUUID().slice(0, 5)}`]) {
      const { error } = await supabase.from("posts").insert({ ...record, slug });
      if (!error) { patch(row.key, { state: "done", slug, msg: status === "published" ? "Publikuar" : "U dërgua për rishikim" }); return true; }
      if (!error.message.includes("duplicate")) { patch(row.key, { state: "error", msg: "Nuk u postua: " + error.message }); return false; }
    }
    patch(row.key, { state: "error", msg: "Ky link ekziston tashmë. Ndrysho pak titullin." });
    return false;
  }

  async function postAllWithPictures() {
    setRunning(true);
    for (const r of rows.filter((r) => r.cover_url && r.state !== "done")) await post(r);
    setRunning(false);
  }

  const waiting = rows.filter((r) => r.state !== "done");
  const ready = waiting.filter((r) => r.cover_url).length;
  const action = canPublish ? "Publiko" : "Dërgo për rishikim";

  return (
    <div className="st-page bulk">
      <div className="st-head">
        <div>
          <h1>Ngarko shumë lajme</h1>
          <p className="muted">Ngarko një sheet me lajme, shto një foto për secilin dhe publikoji një nga një ose të gjitha bashkë.</p>
        </div>
        {waiting.length > 0 && (
          <button className="st-btn primary" disabled={running || ready === 0} onClick={postAllWithPictures}>
            {running ? "Duke postuar…" : `${action} të gjitha me foto (${ready})`}
          </button>
        )}
      </div>

      <div className="bulk-import">
        <div className="bulk-import-top">
        <label className="st-btn primary">
          Zgjidh skedarin CSV
          <input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (f) load(await f.text());
          }} />
        </label>
        <button className="st-link" onClick={() => {
          const url = URL.createObjectURL(new Blob(["﻿" + TEMPLATE], { type: "text/csv;charset=utf-8" }));
          const a = Object.assign(document.createElement("a"), { href: url, download: "lajme-shabllon.csv" });
          a.click(); URL.revokeObjectURL(url);
        }}>Shkarko shabllonin ↓</button>
        </div>
        <details className="bulk-paste">
          <summary>ose ngjit rreshtat nga Google Sheets / Excel</summary>
          <textarea rows={5} placeholder={"kategoria\ttitulli\tpermbledhja\tteksti"} value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button className="st-btn" disabled={!paste.trim()} onClick={() => { load(paste); setPaste(""); }}>Lexo rreshtat</button>
        </details>
        <p className="bulk-help">
          Kolonat: <b>kategoria</b> ({CATEGORIES.map((c) => c.label).join(", ")}), <b>titulli</b>, <b>permbledhja</b>, <b>teksti</b>.
          Kur i krijon me Claude, kërkoji: “Më jep këto lajme si CSV me kolonat kategoria, titulli, permbledhja, teksti.” Paragrafët në tekst ndahen me një rresht bosh.
        </p>
        {warnings.length > 0 && <ul className="bulk-warn">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      </div>

      {rows.length === 0 ? (
        <div className="st-empty"><p>Ende asnjë lajm. Zgjidh një skedar CSV për të filluar.</p></div>
      ) : (
        <>
          <ul className="bulk-list">
            {rows.map((r) => <BulkRow key={r.key} row={r} action={action} busy={running}
              onPick={(f) => pick(r, f)} onChange={(p) => patch(r.key, p)} onPost={() => post(r)}
              onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} />)}
          </ul>
          <button className="st-link danger" onClick={() => { if (confirm("Të hiqen të gjitha lajmet nga kjo listë? Lajmet e postuara mbeten në faqe.")) setRows([]); }}>Pastro listën</button>
        </>
      )}
    </div>
  );
}

function BulkRow({ row, action, busy, onPick, onChange, onPost, onRemove }: {
  row: Row; action: string; busy: boolean;
  onPick: (f: File) => void; onChange: (p: Partial<Row>) => void; onPost: () => void; onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [open, setOpen] = useState(false);
  const done = row.state === "done";
  const working = row.state === "uploading" || row.state === "posting";

  return (
    <li className={`bulk-row ${done ? "done" : ""}`} style={{ ["--hue" as string]: category(row.category).hue }}>
      <div className={`bulk-pic ${over ? "over" : ""} ${row.cover_url ? "has" : ""}`}
        onDragOver={(e) => { e.preventDefault(); if (!done) setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f && !done) onPick(f); }}
        onClick={() => !done && !working && input.current?.click()}>
        {row.state === "uploading" ? <span className="st-spinner" /> : row.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.cover_url} alt="" />
        ) : <span><strong>＋ Foto</strong><small>Kliko ose tërhiqe këtu</small></span>}
        {row.cover_url && !done && <em>Ndrysho</em>}
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
      </div>

      <div className="bulk-fields">
        <div className="bulk-top">
          <select value={row.category} disabled={done} onChange={(e) => onChange({ category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
          <input className="bulk-title" value={row.title} disabled={done} onChange={(e) => onChange({ title: e.target.value })} />
        </div>
        <textarea className="bulk-excerpt" rows={2} placeholder="Përmbledhje" value={row.excerpt} disabled={done} onChange={(e) => onChange({ excerpt: e.target.value })} />
        {open
          ? <textarea className="bulk-body" rows={8} value={row.body} disabled={done} onChange={(e) => onChange({ body: e.target.value })} />
          : <p className="bulk-preview">{row.body.replace(/<[^>]+>/g, " ").slice(0, 220)}{row.body.length > 220 ? "…" : ""}</p>}
        <div className="bulk-actions">
          <button className="st-link" onClick={() => setOpen(!open)}>{open ? "Mbyll tekstin" : "Shiko / ndrysho tekstin"}</button>
          {row.msg && <span className={row.state === "error" ? "st-error" : "st-ok"}>{row.msg}</span>}
          {done ? (
            row.slug && <a className="st-btn ghost" href={`/lajm/${row.slug}`} target="_blank">Shiko ↗</a>
          ) : (
            <>
              <button className="st-link danger" onClick={onRemove} disabled={working}>Hiq</button>
              <button className="st-btn primary" onClick={onPost} disabled={working || busy}>{row.state === "posting" ? "Duke postuar…" : `${action} →`}</button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
