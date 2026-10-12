import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Footer, Header } from "@/components/Chrome";
import { EmptyOrbit, PostCard } from "@/components/PostCard";
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
  return { title: category(slug).label, description: `Lajmet më të fundit nga rubrika ${category(slug).label} në Orbita.` };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const c = CATEGORIES.find((x) => x.slug === slug);
  if (!c) notFound();
  const posts = await latestPosts(60, slug);
  return (
    <>
      <Header active={slug} />
      <main className="wrap" style={{ ["--hue" as string]: c.hue }}>
        <section className="page-head">
          <div className="eyebrow"><i className="dot" />Rubrika</div>
          <h1>{c.label}</h1>
          <p className="muted">{posts.length} {posts.length === 1 ? "artikull" : "artikuj"} në këtë orbitë</p>
        </section>
        {posts.length === 0 ? (
          <EmptyOrbit title="Ende pa lajme këtu." text={`Lajmi i parë në ${c.label} do të shfaqet këtu.`} />
        ) : (
          <div className="grid">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
        )}
      </main>
      <Footer />
    </>
  );
}
