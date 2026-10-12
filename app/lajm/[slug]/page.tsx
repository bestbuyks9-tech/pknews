import { notFound } from "next/navigation";
import type { Metadata } from "next";
import sanitizeHtml from "sanitize-html";
import { Footer, Header } from "@/components/Chrome";
import { Chip, PostCard } from "@/components/PostCard";
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

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await postBySlug(slug);
  if (!post) notFound();
  const c = category(post.category);
  const related = (await latestPosts(7, post.category)).filter((p) => p.id !== post.id).slice(0, 3);
  const html = sanitizeHtml(post.body, ALLOWED);
  const url = `${SITE.url}/lajm/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt,
    image: post.cover_url ? [post.cover_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: post.author_name ? [{ "@type": "Person", name: post.author_name }] : undefined,
    publisher: { "@type": "Organization", name: SITE.name },
  };

  return (
    <>
      <Header active={post.category} />
      <main className="wrap" style={{ ["--hue" as string]: c.hue }}>
        <article className="article">
          <header className="article-head">
            <Chip slug={post.category} />
            <h1>{post.title}</h1>
            {post.excerpt && <p className="dek">{post.excerpt}</p>}
            <div className="byline">
              <span className="avatar">{(post.author_name || "O").slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{post.author_name || "Redaksia Orbita"}</strong>
                <span className="muted">{formatDate(post.published_at)} · {readingTime(post.body)} min lexim</span>
              </div>
              <ShareBar url={url} title={post.title} />
            </div>
          </header>
          {post.cover_url && (
            <figure className="article-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover_url} alt={post.cover_alt || post.title} />
              {post.cover_alt && <figcaption>{post.cover_alt}</figcaption>}
            </figure>
          )}
          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
        {related.length > 0 && (
          <section className="block">
            <div className="block-head"><h2><i className="dot" />Më shumë nga {c.label}</h2><span className="line" /></div>
            <div className="grid">{related.map((p) => <PostCard key={p.id} post={p} />)}</div>
          </section>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </main>
      <Footer />
    </>
  );
}
