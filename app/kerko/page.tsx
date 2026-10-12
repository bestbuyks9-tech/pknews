import { Footer, Header } from "@/components/Chrome";
import { PostCard } from "@/components/PostCard";
import { searchPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kërko" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const results = q ? await searchPosts(q) : [];
  return (
    <>
      <Header />
      <main className="wrap">
        <section className="page-head">
          <div className="eyebrow">Kërkimi</div>
          <form action="/kerko" className="search-big" role="search">
            <input name="q" defaultValue={q} placeholder="Çfarë po kërkon?" autoFocus aria-label="Kërko" />
            <button className="btn" type="submit">Kërko</button>
          </form>
          {q && <p className="muted">{results.length} rezultate për “{q}”</p>}
        </section>
        <div className="grid">{results.map((p) => <PostCard key={p.id} post={p} />)}</div>
      </main>
      <Footer />
    </>
  );
}
