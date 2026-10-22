"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor as TipTap } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { CATEGORIES, MEDIA_MAX, cleanMedia, slugify, type MediaItem, type Post } from "@/lib/site";
import { supabase, type Profile } from "@/lib/browser";
import { CENTRE, coverRect, drawCover, fetchPhoto, uploadCover, uploadExtra, uploadImage, type CoverFrame } from "@/lib/media";

type Draft = Pick<Post, "title" | "slug" | "excerpt" | "body" | "category" | "cover_url" | "cover_alt" | "featured" | "status" | "published_at"> & { media: MediaItem[] };
const EMPTY: Draft = { title: "", slug: "", excerpt: "", body: "", category: "kosova", cover_url: null, cover_alt: "", featured: false, status: "draft", published_at: null, media: [] };

export default function Editor({ id, profile, onClose, onSaved }: { id: string | null; profile: Profile; onClose: () => void; onSaved: (id: string) => void }) {
  const [d, setD] = useState<Draft>(EMPTY);
  const [loaded, setLoaded] = useState(id === null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const canPublish = profile.role !== "editor";
  const edRef = useRef<TipTap | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: "Shkruaj lajmin këtu… (ngjit tekst, tërhiq foto brenda)" }),
    ],
    content: "",
    onUpdate: ({ editor }) => { setD((x) => ({ ...x, body: editor.getHTML() })); setDirty(true); },
    editorProps: {
      handleDrop: (_view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return false;
        event.preventDefault();
        uploadImage(file).then((src) => edRef.current?.chain().focus().setImage({ src, alt: "" }).run()).catch((err: Error) => setNotice({ kind: "err", text: err.message }));
        return true;
      },
      handlePaste: (_view, event) => {
        const file = event.clipboardData?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return false;
        uploadImage(file).then((src) => edRef.current?.chain().focus().setImage({ src, alt: "" }).run()).catch((err: Error) => setNotice({ kind: "err", text: err.message }));
        return true;
      },
    },
  });
  edRef.current = editor;

  useEffect(() => {
    if (!id) return;
    supabase.from("posts").select("*").eq("id", id).single().then(({ data }) => {
      if (data) { setD({ ...(data as Draft), media: cleanMedia(data.media) }); setSlugTouched(true); }
      setLoaded(true);
    });
  }, [id]);

  useEffect(() => { if (loaded && editor && d.body && editor.isEmpty) editor.commands.setContent(d.body); }, [loaded, editor]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((x) => ({ ...x, [k]: v })); setDirty(true); };

  const save = useCallback(async (nextStatus?: Post["status"]) => {
    if (!d.title.trim()) { setNotice({ kind: "err", text: "Shto një titull para se të ruash." }); return; }
    const status = nextStatus ?? d.status;
    const saved = (r: { id: string; slug: string; published_at: string | null }) => r;
    setSaving(status); setNotice(null);
    const slug = (d.slug || slugify(d.title)) || crypto.randomUUID().slice(0, 8);
    const record = {
      title: d.title.trim(), slug, excerpt: d.excerpt.trim(), body: d.body, category: d.category,
      cover_url: d.cover_url, cover_alt: d.cover_alt, featured: d.featured, status, media: cleanMedia(d.media),
      published_at: status === "published" ? (d.published_at ?? new Date().toISOString()) : d.published_at,
    };
    const res = id
      ? await supabase.from("posts").update(record).eq("id", id).select("id,slug,published_at").single()
      : await supabase.from("posts").insert({ ...record, author_id: profile.user_id, author_name: profile.display_name || profile.email || "Redaksia" }).select("id,slug,published_at").single();
    setSaving(null);
    if (res.error || !res.data) {
      const m = res.error?.message ?? "Gabim i panjohur";
      setNotice({ kind: "err", text: m.includes("duplicate") ? "Ky link (slug) ekziston. Ndrysho pak titullin ose linkun." : "Ruajtja dështoi: " + m });
      return;
    }
    const row = saved(res.data);
    setD((x) => ({ ...x, status, slug: row.slug, published_at: row.published_at }));
    setDirty(false);
    setNotice({ kind: "ok", text: status === "published" ? "Publikuar! Shfaqet në faqe brenda ~30 sekondash." : status === "review" ? "U dërgua për rishikim." : "Drafti u ruajt." });
    if (!id) onSaved(row.id);
  }, [d, id, profile, onSaved]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  async function remove() {
    if (!id || !confirm("Ta fshij përgjithmonë këtë postim?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) setNotice({ kind: "err", text: "Nuk u fshi: " + error.message });
    else onClose();
  }

  if (!loaded) return <div className="st-center small"><span className="st-spinner" /></div>;

  return (
    <div className="ed">
      <div className="ed-bar">
        <button className="st-link" onClick={() => { if (!dirty || confirm("Ke ndryshime të paruajtura. Të dalësh gjithsesi?")) onClose(); }}>← Postimet</button>
        <span className="ed-state">{dirty ? "Ndryshime të paruajtura" : d.status === "published" ? "● Live" : "Ruajtur"}</span>
        <div className="ed-actions">
          {d.status === "published" && <a className="st-btn ghost" href={`/lajm/${d.slug}`} target="_blank">Shiko ↗</a>}
          <button className="st-btn save" onClick={() => save(d.status === "published" ? "published" : "draft")} disabled={!!saving}>{saving === "draft" ? "Duke ruajtur…" : d.status === "published" ? "Përditëso" : "Ruaj draftin"}</button>
          {canPublish ? (
            d.status === "published"
              ? <button className="st-btn danger" onClick={() => save("draft")} disabled={!!saving}>Hiq nga faqja</button>
              : <button className="st-btn primary" onClick={() => save("published")} disabled={!!saving}>{saving === "published" ? "Duke publikuar…" : "Publiko →"}</button>
          ) : (
            <button className="st-btn primary" onClick={() => save("review")} disabled={!!saving || d.status === "review"}>{d.status === "review" ? "Në rishikim" : "Dërgo për rishikim →"}</button>
          )}
        </div>
      </div>
      {notice && <div className={`ed-notice ${notice.kind}`} onClick={() => setNotice(null)}>{notice.text}</div>}

      <div className="ed-grid">
        <div className="ed-doc">
          <CoverDrop url={d.cover_url} uploading={uploading} photos={articlePhotos(d)} onError={(text) => setNotice({ kind: "err", text })}
            onPick={async (photo, frame) => {
              setUploading(true);
              try { set("cover_url", await uploadCover(photo, frame)); } catch (e) { setNotice({ kind: "err", text: (e as Error).message }); }
              setUploading(false);
            }} onClear={() => set("cover_url", null)} />
          {d.cover_url && <input className="ed-caption" placeholder="Përshkrimi i fotos / burimi (opsional)" value={d.cover_alt ?? ""} onChange={(e) => set("cover_alt", e.target.value)} />}
          <textarea className="ed-title" rows={1} placeholder="Titulli i lajmit" value={d.title}
            onChange={(e) => { set("title", e.target.value); if (!slugTouched) setD((x) => ({ ...x, title: e.target.value, slug: slugify(e.target.value) })); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }} />
          <textarea className="ed-excerpt" rows={2} placeholder="Përmbledhje e shkurtër — shfaqet në kartë dhe kur shpërndahet në rrjete sociale" value={d.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
          <Toolbar editor={editor} onImage={async (f) => {
            setUploading(true);
            try { const src = await uploadImage(f); editor?.chain().focus().setImage({ src, alt: "" }).run(); } catch (e) { setNotice({ kind: "err", text: (e as Error).message }); }
            setUploading(false);
          }} />
          <EditorContent editor={editor} className="ed-body prose" />
          <ExtraMedia items={d.media} onChange={(m) => set("media", m)} onError={(text) => setNotice({ kind: "err", text })} />
        </div>

        <aside className="ed-panel">
          <div className="ed-field">
            <label>Rubrika</label>
            <div className="ed-cats">
              {CATEGORIES.map((c) => (
                <button key={c.slug} type="button" className={d.category === c.slug ? "on" : ""} style={{ ["--hue" as string]: c.hue }} onClick={() => set("category", c.slug)}>{c.label}</button>
              ))}
            </div>
          </div>
          {canPublish && (
            <label className="ed-toggle">
              <input type="checkbox" checked={d.featured} onChange={(e) => set("featured", e.target.checked)} />
              <span><strong>Lajm kryesor</strong><small>Shfaqet i madh në krye të ballinës</small></span>
            </label>
          )}
          <div className="ed-field">
            <label>Linku</label>
            <div className="ed-slug"><span>/lajm/</span><input value={d.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} /></div>
          </div>
          <div className="ed-tips">
            <strong>Këshilla</strong>
            <ul>
              <li>Tërhiq ose ngjit foto direkt në tekst.</li>
              <li><kbd>Ctrl/⌘ S</kbd> ruan menjëherë.</li>
              <li>Përdor “H2” për nëntituj — e bën lajmin më të lexueshëm.</li>
            </ul>
          </div>
          {id && (canPublish || d.status !== "published") && <button className="st-link danger" onClick={remove}>Fshi postimin</button>}
        </aside>
      </div>
    </div>
  );
}

/** Photos already in the article (in the text or the extra media) that can be made the main picture. */
function articlePhotos(d: Draft) {
  const inText = [...d.body.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const extra = d.media.filter((m) => m.type === "image").map((m) => m.url);
  return [...new Set([...inText, ...extra])].filter((u) => u !== d.cover_url);
}

/**
 * The main picture: drop or pick a photo, or reuse one from the article, then choose which part of it
 * shows in the 16:9 frame. "Rregullo" reframes the current picture. Buttons stay visible so they work on phones.
 */
function CoverDrop({ url, uploading, photos, onPick, onClear, onError }: {
  url: string | null; uploading: boolean; photos: string[];
  onPick: (photo: Blob, frame: CoverFrame) => void; onClear: () => void; onError: (text: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [framing, setFraming] = useState<Blob | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [opening, setOpening] = useState(false);

  function frame(f: File) {
    if (!f.type.startsWith("image/")) return onError("Zgjidh një foto (JPG, PNG, WEBP).");
    // GIF and SVG can't be cropped without losing animation or sharpness, so they go up as they are.
    if (f.type === "image/gif" || f.type === "image/svg+xml") return onPick(f, CENTRE);
    setFraming(f);
  }
  async function reuse(src: string) {
    setOpening(true);
    try { setFraming(await fetchPhoto(src)); setChoosing(false); } catch (e) { onError((e as Error).message); }
    setOpening(false);
  }

  return (
    <>
      <div className={`ed-cover ${over ? "over" : ""} ${url ? "has" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) frame(f); }}
        onClick={() => !url && !uploading && input.current?.click()}>
        {url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={url} alt="" />
        ) : (
          <div className="ed-cover-empty">{uploading ? <span className="st-spinner" /> : <><strong>＋ Foto kryesore</strong><small>Tërhiqe këtu ose kliko për ta zgjedhur. Pastaj zgjedh cila pjesë shfaqet.</small></>}</div>
        )}
        {url && uploading && <div className="ed-cover-busy"><span className="st-spinner" /></div>}
      </div>
      <div className="ed-cover-actions">
        <button type="button" disabled={uploading} onClick={() => input.current?.click()}>{url ? "Ndrysho foton" : "Ngarko foto"}</button>
        {url && <button type="button" disabled={uploading || opening} onClick={() => reuse(url)}>Rregullo prerjen</button>}
        {photos.length > 0 && <button type="button" disabled={uploading} className={choosing ? "on" : ""} onClick={() => setChoosing(!choosing)}>Nga fotot e artikullit</button>}
        {url && <button type="button" className="danger" disabled={uploading} onClick={onClear}>Hiq</button>}
      </div>
      {choosing && (
        <ul className="ed-cover-pick">
          {photos.map((p) => (
            <li key={p}><button type="button" disabled={opening} onClick={() => reuse(p)} title="Bëje foto kryesore">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" />
            </button></li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) frame(f); e.target.value = ""; }} />
      {framing && <CoverFramer photo={framing} onCancel={() => setFraming(null)} onDone={(f) => { onPick(framing, f); setFraming(null); }} onError={(t) => { onError(t); setFraming(null); }} />}
    </>
  );
}

const PREVIEW_W = 800;
const PREVIEW_H = 450;

/** Drag the photo to move it inside the 16:9 frame, and use the slider to zoom in. */
function CoverFramer({ photo, onCancel, onDone, onError }: { photo: Blob; onCancel: () => void; onDone: (f: CoverFrame) => void; onError: (text: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [bmp, setBmp] = useState<ImageBitmap | null>(null);
  const [f, setF] = useState<CoverFrame>(CENTRE);
  const drag = useRef<{ px: number; py: number; start: CoverFrame } | null>(null);

  useEffect(() => {
    let live = true, made: ImageBitmap | null = null;
    createImageBitmap(photo).then((b) => { made = b; if (live) setBmp(b); else b.close(); })
      .catch(() => onError("Fotoja nuk u hap. Provo një tjetër."));
    return () => { live = false; made?.close(); };
  }, [photo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (bmp && canvas.current) drawCover(canvas.current, bmp, f, PREVIEW_W, PREVIEW_H); }, [bmp, f]);

  // Keep the centre where the crop can actually reach, so dragging back responds at once.
  const settle = (x: number, y: number, zoom: number): CoverFrame => {
    if (!bmp) return { x, y, zoom };
    const r = coverRectFor(bmp, zoom);
    const hx = r.sw / 2 / bmp.width, hy = r.sh / 2 / bmp.height;
    return { x: Math.min(Math.max(x, hx), 1 - hx), y: Math.min(Math.max(y, hy), 1 - hy), zoom };
  };

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drag.current || !bmp) return;
    const box = e.currentTarget.getBoundingClientRect();
    const r = coverRectFor(bmp, f.zoom);
    const { px, py, start } = drag.current;
    const dx = ((e.clientX - px) / box.width) * r.sw / bmp.width;
    const dy = ((e.clientY - py) / box.height) * r.sh / bmp.height;
    setF(settle(start.x - dx, start.y - dy, f.zoom));
  }

  return (
    <div className="ed-framer" role="dialog" aria-label="Zgjidh pjesën e fotos" onClick={onCancel}>
      <div className="ed-framer-card" onClick={(e) => e.stopPropagation()}>
        <strong>Zgjidh cila pjesë e fotos shfaqet</strong>
        <small className="muted">Tërhiqe foton për ta lëvizur. Zmadho me rrëshqitësin.</small>
        <div className="ed-framer-stage">
          {bmp ? (
            <canvas ref={canvas}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, start: f }; }}
              onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} />
          ) : <span className="st-spinner" />}
        </div>
        <label className="ed-framer-zoom">
          <span>Zmadhimi</span>
          <input type="range" min={1} max={3} step={0.01} value={f.zoom} disabled={!bmp} onChange={(e) => setF(settle(f.x, f.y, Number(e.target.value)))} />
        </label>
        <div className="ed-framer-actions">
          <button type="button" className="st-btn ghost" onClick={() => setF(CENTRE)} disabled={!bmp}>Qendro</button>
          <span />
          <button type="button" className="st-btn ghost" onClick={onCancel}>Anulo</button>
          <button type="button" className="st-btn primary" disabled={!bmp} onClick={() => onDone(f)}>Përdore këtë</button>
        </div>
      </div>
    </div>
  );
}

function coverRectFor(bmp: ImageBitmap, zoom: number) {
  return coverRect(bmp.width, bmp.height, { x: 0.5, y: 0.5, zoom });
}

function Toolbar({ editor, onImage }: { editor: TipTap | null; onImage: (f: File) => void }) {
  const file = useRef<HTMLInputElement>(null);
  if (!editor) return null;
  const b = (label: string, active: boolean, run: () => void, title: string) => (
    <button type="button" title={title} className={active ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); run(); }}>{label}</button>
  );
  return (
    <div className="ed-tools">
      {b("H2", editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Nëntitull")}
      {b("H3", editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Nëntitull i vogël")}
      <i />
      {b("B", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold")}
      {b("I", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic")}
      {b("❝", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "Citat")}
      {b("•", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Listë")}
      {b("1.", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Listë me numra")}
      <i />
      {b("🔗", editor.isActive("link"), () => {
        if (editor.isActive("link")) { editor.chain().focus().unsetLink().run(); return; }
        const url = prompt("Vendos linkun (https://…)");
        if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      }, "Link")}
      {b("🖼", false, () => file.current?.click(), "Shto foto")}
      {b("―", false, () => editor.chain().focus().setHorizontalRule().run(), "Ndarës")}
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImage(f); e.target.value = ""; }} />
    </div>
  );
}

/** Optional extra photos/video for inside the article: up to MEDIA_MAX items, at most one video. */
function ExtraMedia({ items, onChange, onError }: { items: MediaItem[]; onChange: (m: MediaItem[]) => void; onError: (text: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const hasVideo = items.some((m) => m.type === "video");
  const full = items.length >= MEDIA_MAX;
  const patch = (i: number, p: Partial<MediaItem>) => onChange(items.map((m, j) => (j === i ? { ...m, ...p } : m)));

  async function add(file: File) {
    if (full) return onError(`Mund të shtosh deri në ${MEDIA_MAX} media shtesë.`);
    if (file.type.startsWith("video/") && hasVideo) return onError("Lejohet vetëm një video për artikull.");
    setBusy(true);
    try { onChange([...items, await uploadExtra(file)]); } catch (e) { onError((e as Error).message); }
    setBusy(false);
  }

  return (
    <section className="ed-media">
      <div className="ed-media-head">
        <div>
          <strong>Media shtesë</strong>
          <small>Opsionale · deri në {MEDIA_MAX} foto ose video, vetëm 1 video. Shfaqen brenda tekstit, jo në vend të fotos kryesore.</small>
        </div>
        {!full && (
          <button type="button" className="st-btn primary" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Duke ngarkuar…" : hasVideo ? "＋ Foto" : "＋ Foto ose video"}
          </button>
        )}
      </div>
      {items.length > 0 && (
        <ul className="ed-media-list">
          {items.map((m, i) => (
            <li key={m.url}>
              <div className={`ed-media-frame ${m.mode}`}>
                {m.type === "video"
                  ? <video src={m.url} muted playsInline preload="metadata" controls />
                  : /* eslint-disable-next-line @next/next/no-img-element */ <img src={m.url} alt="" />}
              </div>
              <div className="ed-media-opts">
                <span className="ed-media-kind">{m.type === "video" ? "Video" : "Foto"}</span>
                <div className="ed-media-mode" role="group" aria-label="Formati">
                  <button type="button" className={m.mode === "portrait" ? "on" : ""} onClick={() => patch(i, { mode: "portrait" })}>Portret</button>
                  <button type="button" className={m.mode === "landscape" ? "on" : ""} onClick={() => patch(i, { mode: "landscape" })}>Horizontal</button>
                </div>
                <input placeholder="Përshkrimi / burimi (opsional)" value={m.caption ?? ""} onChange={(e) => patch(i, { caption: e.target.value })} />
                <button type="button" className="st-link danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>Hiq</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" hidden accept={hasVideo ? "image/*" : "image/*,video/mp4,video/webm,video/quicktime"}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) add(f); e.target.value = ""; }} />
    </section>
  );
}
