import { SITE } from "@/lib/site";

/** Facebook Page Plugin for the sidebar. Hidden until SITE.facebook is set. */
export function FacebookBox() {
  if (!SITE.facebook) return null;
  const src = `https://www.facebook.com/plugins/page.php?${new URLSearchParams({
    href: SITE.facebook,
    tabs: "timeline",
    width: "300",
    height: "500",
    small_header: "false",
    adapt_container_width: "true",
    hide_cover: "false",
    show_facepile: "true",
    locale: "sq_AL",
  })}`;
  return (
    <section className="fb-box">
      <div className="sec-head"><h2>Na ndiqni në Facebook</h2></div>
      <iframe
        src={src}
        title={`${SITE.name} në Facebook`}
        width={300}
        height={500}
        style={{ border: "none", overflow: "hidden", maxWidth: "100%" }}
        scrolling="no"
        allow="encrypted-media"
        loading="lazy"
      />
    </section>
  );
}
