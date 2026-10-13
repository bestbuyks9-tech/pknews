import Link from "next/link";
import { category, timeAgo, type Post } from "@/lib/site";

export function Thumb({ post }: { post: Post }) {
  return (
    <div className="thumb">
      {post.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_url} alt={post.cover_alt || ""} loading="lazy" />
      ) : (
        <div className="thumb-empty" aria-hidden="true">O</div>
      )}
    </div>
  );
}

export function Kicker({ slug }: { slug: string }) {
  const c = category(slug);
  return <span className="kicker" style={{ ["--hue" as string]: c.hue }}>{c.label}</span>;
}

export function LeadStory({ post }: { post: Post }) {
  return (
    <Link href={`/lajm/${post.slug}`} className="lead-story">
      <Thumb post={post} />
      <div style={{ marginTop: 12 }}>
        <Kicker slug={post.category} />
        <h2 className="headline">{post.title}</h2>
        {post.excerpt && <p>{post.excerpt}</p>}
        <span className="time">{timeAgo(post.published_at)}</span>
      </div>
    </Link>
  );
}

export function Card({ post, excerpt = true }: { post: Post; excerpt?: boolean }) {
  return (
    <Link href={`/lajm/${post.slug}`} className="card">
      <Thumb post={post} />
      <div style={{ marginTop: 10 }}>
        <Kicker slug={post.category} />
        <h3 className="headline">{post.title}</h3>
        {excerpt && post.excerpt && <p>{post.excerpt}</p>}
      </div>
    </Link>
  );
}

export function RowItem({ post }: { post: Post }) {
  return (
    <Link href={`/lajm/${post.slug}`} className="row-item">
      <Thumb post={post} />
      <div>
        <Kicker slug={post.category} />
        <h3 className="headline">{post.title}</h3>
        <span className="time">{timeAgo(post.published_at)}</span>
      </div>
    </Link>
  );
}

export function TextItem({ post }: { post: Post }) {
  return (
    <Link href={`/lajm/${post.slug}`} className="text-item">
      <span className="time">{timeAgo(post.published_at)}</span>
      <h3 className="headline">{post.title}</h3>
    </Link>
  );
}

export function ListStory({ post }: { post: Post }) {
  return (
    <Link href={`/lajm/${post.slug}`} className="list-story">
      <Thumb post={post} />
      <div>
        <Kicker slug={post.category} /> <span className="time">· {timeAgo(post.published_at)}</span>
        <h2 className="headline">{post.title}</h2>
        {post.excerpt && <p>{post.excerpt}</p>}
      </div>
    </Link>
  );
}

export function MostRead({ posts, title = "Më të lexuarat" }: { posts: Post[]; title?: string }) {
  if (!posts.length) return null;
  return (
    <section className="most-read">
      <div className="sec-head"><h2>{title}</h2></div>
      <ol>
        {posts.map((p) => (
          <li key={p.id}><Link href={`/lajm/${p.slug}`}><span className="headline">{p.title}</span></Link></li>
        ))}
      </ol>
    </section>
  );
}

export function SecHead({ title, href, hue }: { title: string; href?: string; hue?: string }) {
  return (
    <div className="sec-head" style={hue ? { ["--hue" as string]: hue } : undefined}>
      <h2>{title}</h2>
      {href && <Link href={href}>Të gjitha →</Link>}
    </div>
  );
}

export function Empty({ title, text, home = true }: { title: string; text: string; home?: boolean }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{text}</p>
      {home && <Link className="btn" href="/">Kthehu në ballinë</Link>}
    </div>
  );
}
