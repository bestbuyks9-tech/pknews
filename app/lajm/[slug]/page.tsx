import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import sanitizeHtml from "sanitize-html";
import { Footer, Header } from "@/components/Chrome";
import { FacebookBox } from "@/components/FacebookBox";
import { Ad } from "@/components/Ad";
import { Card, Kicker, MostRead, SecHead } from "@/components/PostCard";
import { ShareBar } from "@/components/ShareBar";
import { latestPosts, postBySlug } from "@/lib/posts";
import { SITE, category, formatDate, readingTime } from "@/lib/site";

export const revalidate = 30;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await postBySlug(slug);
  if (!post) return { title: "Nuk u gjet" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/lajm/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.published_at ?? undefined,
      images: post.cover_url ? [{ url: post.cover_url }] : undefined,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt, images: post.cover_url ? [post.cover_url] : undefined },
  };
}

const ALLOWED = {
  allowedTags: ["p", "h2", "h3", "h4", "strong", "em", "s", "u", "a", "ul", "ol", "li", "blockquote", "img", "figure", "figcaption", "hr", "br", "code", "pre"],
  allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }) },
};

/** Split article HTML after the 2nd paragraph so an ad can sit inside the story. */
function splitForAd(html: string): [string, string] {
  let idx = -1;
  for (let n = 0; n < 2; n++) {
    const next = html.indexOf("</p>", idx + 1);
    if (next === -1) return [html, ""];
    idx = next;
  }
  const cut = idx + 4;
  return [html.slice(0, cut), html.slice(cut)];
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await postBySlug(slug);
  if (!post) notFound();
  const c = category(post.category);
  const [sameCat, latest] = await Promise.all([latestPosts(7, post.category), latestPosts(8)]);
  const related = sameCat.filter((p) => p.id !== post.id).slice(0, 3);
  const [first, second] = splitForAd(sanitizeHtml(post.body, ALLOWED));
  const url = `${SITE.url}/lajm/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt,
    image: post.cover_url ? [post.cover_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: [{ "@type": post.author_name ? "Person" : "Organization", name: post.author_name || "Redaksia Politika Kosovare" }],
    publisher: { "@type": "Organization", name: SITE.name },
  };

  return (
    <>
      <Header active={post.category} />
      <main id="main" className="wrap" style={{ ["--hue" as string]: c.hue }}>
        <nav className="crumbs" aria-label="Ku ndodhesh">
          <Link href="/">Ballina</Link> › <Link href={`/${c.slug}`}>{c.label}</Link>
        </nav>
        <div className="with-side">
          <article className="article">
            <Kicker slug={post.category} />
            <h1>{post.title}</h1>
            {post.excerpt && <p className="dek">{post.excerpt}</p>}
            <div className="byline">
              <span>Nga <strong>{post.author_name || "Redaksia Politika Kosovare"}</strong></span>
              <span className="muted">{formatDate(post.published_at)} · {readingTime(post.body)} min lexim</span>
              <ShareBar url={url} title={post.title} />
            </div>
            {post.cover_url && (
              <figure className="article-cover" style={{ margin: "20px 0" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.cover_url} alt={post.cover_alt || ""} />
                {post.cover_alt && <figcaption>{post.cover_alt}</figcaption>}
              </figure>
            )}
            <div className="prose">
              <div dangerouslySetInnerHTML={{ __html: first }} />
              {second && <div className="ad-wrap"><Ad size="rectangle" /></div>}
              {second && <div dangerouslySetInnerHTML={{ __html: second }} />}
            </div>
          </article>
          <aside className="sidebar" style={{ paddingTop: 20 }}>
            <Ad size="rectangle" />
            <FacebookBox />
            <MostRead title="Lajmet e fundit" posts={latest.filter((p) => p.id !== post.id).slice(0, 6)} />
            <div style={{ position: "sticky", top: 70 }}><Ad size="halfpage" /></div>
          </aside>
        </div>
        {related.length > 0 && (
          <section className="section">
            <SecHead title={`Më shumë nga ${c.label}`} href={`/${c.slug}`} hue={c.hue} />
            <div className="grid-3">{related.map((p) => <Card key={p.id} post={p} />)}</div>
          </section>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </main>
      <Footer />
    </>
  );
}
