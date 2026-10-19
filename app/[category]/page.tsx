import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Footer, Header } from "@/components/Chrome";
import { FacebookBox } from "@/components/FacebookBox";
import { Ad } from "@/components/Ad";
import { Empty, ListStory, MostRead } from "@/components/PostCard";
import { latestPosts } from "@/lib/posts";
import { CATEGORIES, category } from "@/lib/site";

export const revalidate = 30;
export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  return { title: category(slug).label, description: `Lajmet më të fundit nga rubrika ${category(slug).label} në Politika Kosovare.` };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const c = CATEGORIES.find((x) => x.slug === slug);
  if (!c) notFound();
  const [posts, latest] = await Promise.all([latestPosts(60, slug), latestPosts(8)]);
  return (
    <>
      <Header active={slug} />
      <main id="main" className="wrap" style={{ ["--hue" as string]: c.hue }}>
        <section className="page-head">
          <h1>{c.label}</h1>
          <p className="muted" style={{ margin: "0 0 14px" }}>{posts.length} {posts.length === 1 ? "artikull" : "artikuj"}</p>
        </section>
        <div className="with-side">
          <div>
            {posts.length === 0 ? (
              <Empty title="Ende pa lajme këtu." text={`Lajmet e para nga ${c.label} do të shfaqen këtu.`} />
            ) : (
              posts.map((p) => <ListStory key={p.id} post={p} />)
            )}
          </div>
          <aside className="sidebar">
            <Ad size="rectangle" />
            <FacebookBox />
            <MostRead title="Lajmet e fundit" posts={latest.filter((p) => p.category !== slug).slice(0, 6)} />
            <div style={{ position: "sticky", top: 70 }}><Ad size="halfpage" /></div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
