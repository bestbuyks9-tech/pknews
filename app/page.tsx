import { Footer, Header } from "@/components/Chrome";
import { FacebookBox } from "@/components/FacebookBox";
import { Ad, AdBand, SideRails } from "@/components/Ad";
import { Card, Empty, LeadStory, MostRead, RowItem, SecHead, TextItem } from "@/components/PostCard";
import { latestPosts } from "@/lib/posts";
import { CATEGORIES } from "@/lib/site";

export const revalidate = 30;

export default async function Home() {
  const posts = await latestPosts(60);
  const lead = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p.id !== lead?.id);
  const top = rest.slice(0, 5);
  const latest = rest.slice(5, 13);
  const sections = CATEGORIES.map((c) => ({ c, items: posts.filter((p) => p.category === c.slug) })).filter((s) => s.items.length > 0);

  return (
    <>
      <Header breaking={posts.slice(0, 8)} />
      <main id="main" className="wrap">
        <SideRails />
        {!lead ? (
          <Empty title="Ende nuk ka lajme të publikuara." text="Ju lutemi rikthehuni së shpejti." home={false} />
        ) : (
          <>
            <section className="home-top" aria-label="Lajmet kryesore">
              <LeadStory post={lead} />
              <div className="col-rule">
                <SecHead title="Kryesoret" />
                {top.map((p) => <RowItem key={p.id} post={p} />)}
              </div>
              <aside className="sidebar">
                <Ad size="rectangle" />
                <FacebookBox />
                <MostRead title="Lajmet e fundit" posts={posts.slice(0, 6)} />
              </aside>
            </section>

            <AdBand size="billboard" />

            {latest.length > 0 && (
              <section className="section">
                <SecHead title="Të rejat" />
                <div className="grid-4">{latest.map((p) => <Card key={p.id} post={p} />)}</div>
              </section>
            )}

            {sections.map(({ c, items }, i) => (
              <div key={c.slug}>
                <section className="section">
                  <SecHead title={c.label} href={`/${c.slug}`} hue={c.hue} />
                  <div className="cat-block">
                    <Card post={items[0]} />
                    <div>
                      {items.slice(1, 5).map((p) => <TextItem key={p.id} post={p} />)}
                      {items.length === 1 && <p className="muted">Më shumë lajme nga {c.label} së shpejti.</p>}
                    </div>
                  </div>
                </section>
                {i % 2 === 1 && i < sections.length - 1 && <AdBand size="leaderboard" />}
              </div>
            ))}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
