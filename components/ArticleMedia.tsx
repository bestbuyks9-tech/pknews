import type { MediaItem } from "@/lib/site";

/**
 * Extra photos/video inside an article, in a fixed-width frame whose shape follows the chosen
 * mode (portrait 3:4, landscape 16:9). Renders nothing when the article has none.
 */
export function ArticleMedia({ items }: { items: MediaItem[] }) {
  if (!items.length) return null;
  return (
    <div className="article-media">
      {items.map((m) => (
        <figure key={m.url} className={`am am-${m.mode}`}>
          <div className="am-frame">
            {m.type === "video" ? (
              <video src={m.url} controls playsInline preload="metadata" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt={m.caption || ""} loading="lazy" />
            )}
          </div>
          {m.caption && <figcaption>{m.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
