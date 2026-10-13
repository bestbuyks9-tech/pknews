import { Footer, Header } from "@/components/Chrome";
import { Ad } from "@/components/Ad";
import { ListStory } from "@/components/PostCard";
import { searchPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kërko" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const results = q ? await searchPosts(q) : [];
  return (
    <>
      <Header />
      <main id="main" className="wrap">
        <section className="page-head">
          <h1>Kërko</h1>
          <form action="/kerko" className="search-big" role="search">
            <input name="q" defaultValue={q} placeholder="Shkruaj një fjalë kyçe…" aria-label="Kërko" />
            <button className="btn" type="submit">Kërko</button>
          </form>
          {q && <p className="muted" style={{ margin: "0 0 14px" }}>{results.length} rezultate për “{q}”</p>}
        </section>
        <div className="with-side">
          <div>{results.map((p) => <ListStory key={p.id} post={p} />)}</div>
          <aside className="sidebar"><Ad size="rectangle" /></aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
