import Link from "next/link";
import { category, readingTime, timeAgo, type Post } from "@/lib/site";
import { OrbitMark } from "./Logo";

function Cover({ post, className }: { post: Post; className?: string }) {
  const c = category(post.category);
  return (
    <div className={`cover ${className ?? ""}`} style={{ ["--hue" as string]: c.hue }}>
      {post.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_url} alt={post.cover_alt || post.title} loading="lazy" />
      ) : (
        <div className="cover-fallback"><OrbitMark size={56} /></div>
      )}
    </div>
  );
}

export function Chip({ slug }: { slug: string }) {
  const c = category(slug);
  return <span className="chip" style={{ ["--hue" as string]: c.hue }}>{c.label}</span>;
}

export function Meta({ post }: { post: Post }) {
  return (
    <div className="meta">
      <Chip slug={post.category} />
      <span>{timeAgo(post.published_at)}</span>
      <span>· {readingTime(post.body || "")} min</span>
    </div>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/lajm/${post.slug}`} className="card">
      <Cover post={post} />
      <div className="card-body">
        <Meta post={post} />
        <h3>{post.title}</h3>
        {post.excerpt && <p>{post.excerpt}</p>}
      </div>
    </Link>
  );
}

export function LeadStory({ post }: { post: Post }) {
  return (
    <Link href={`/lajm/${post.slug}`} className="lead">
      <Cover post={post} className="lead-cover" />
      <div className="lead-shade" />
      <div className="lead-text">
        <Meta post={post} />
        <h1>{post.title}</h1>
        {post.excerpt && <p>{post.excerpt}</p>}
      </div>
    </Link>
  );
}

export function RowStory({ post, index }: { post: Post; index?: number }) {
  return (
    <Link href={`/lajm/${post.slug}`} className="row-story">
      {index !== undefined && <span className="row-num">{String(index + 1).padStart(2, "0")}</span>}
      <div>
        <Meta post={post} />
        <h4>{post.title}</h4>
      </div>
    </Link>
  );
}

export function EmptyOrbit({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <div className="empty-orbit"><span /><span /><span /><OrbitMark size={64} /></div>
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      <Link className="btn" href="/studio">Shkruaj lajmin e parë →</Link>
    </div>
  );
}
