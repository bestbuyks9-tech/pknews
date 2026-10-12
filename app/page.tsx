import { Footer, Header } from "@/components/Chrome";
import { EmptyOrbit, LeadStory, PostCard, RowStory } from "@/components/PostCard";
import { latestPosts } from "@/lib/posts";
import { CATEGORIES } from "@/lib/site";
import Link from "next/link";

export const revalidate = 30;

export default async function Home() {
  const posts = await latestPosts(40);
  const lead = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p.id !== lead?.id);
  const side = rest.slice(0, 4);
  const grid = rest.slice(4, 13);

  return (
    <>
      <Header />
      {posts.length > 0 && (
        <div className="ticker" aria-label="Të fundit">
          <span className="ticker-label"><i className="pulse" />TANI</span>
          <div className="ticker-track">
            <div className="ticker-move">
              {[...posts.slice(0, 8), ...posts.slice(0, 8)].map((p, i) => (
                <Link key={i} href={`/lajm/${p.slug}`}>{p.title}</Link>
              ))}
            </div>
          </div>
        </div>
      )}
      <main className="wrap">
        {!lead ? (
          <EmptyOrbit title="Orbita është gati për nisje." text="Sapo të publikohet lajmi i parë nga Studio, ai shfaqet këtu brenda pak sekondash." />
        ) : (
          <>
            <section className="hero">
              <LeadStory post={lead} />
              <aside className="hero-side">
                <div className="eyebrow">Në orbitë tani</div>
                {side.map((p, i) => <RowStory key={p.id} post={p} index={i} />)}
              </aside>
            </section>

            {grid.length > 0 && (
              <section className="block">
                <div className="block-head"><h2>Të fundit</h2><span className="line" /></div>
                <div className="grid">{grid.map((p) => <PostCard key={p.id} post={p} />)}</div>
              </section>
            )}

            {CATEGORIES.map((c) => {
              const items = posts.filter((p) => p.category === c.slug).slice(0, 3);
              if (items.length === 0) return null;
              return (
                <section className="block" key={c.slug} style={{ ["--hue" as string]: c.hue }}>
                  <div className="block-head">
                    <h2><i className="dot" />{c.label}</h2>
                    <span className="line" />
                    <Link href={`/${c.slug}`} className="more">Të gjitha →</Link>
                  </div>
                  <div className="grid">{items.map((p) => <PostCard key={p.id} post={p} />)}</div>
                </section>
              );
            })}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
