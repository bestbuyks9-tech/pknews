# Politika Kosovare

News site built with Next.js (App Router) on Vercel, with Supabase for posts, photos and staff logins.

## Posting news
1. Go to `/studio` and sign in.
2. Click **＋ Postim i ri**, drop a cover photo, write the title, summary and story.
3. Pick a section and click **Publiko**. It appears on the site within ~30 seconds.

Journalists (role *Gazetar*) can only send posts **for review**; editors-in-chief (*Kryeredaktor*) and admins publish.
Admins add or remove people under **Ekipi** in the Studio.

## Structure
- `app/` — public pages: home, `/[rubrika]`, `/lajm/[slug]`, `/kerko`, and `/studio`
- `components/` — header, footer, logo, cards
- `lib/` — site config (name, sections, colours) and data access
- `supabase/migrations/001_orbita.sql` — database schema
- `supabase/functions/team` — admin-only edge function to add/remove staff

Sections and their colours live in `lib/site.ts`. Ad spaces are placeholders in `components/Ad.tsx` — replace them with your ad network code (e.g. AdSense) when ready.

## AdsKeeper
The AdsKeeper loader (site 1116858) is in the `<head>` of every page, and native widget 2099408 fills the in-article, under-article, sidebar and home billboard spaces. The other placeholder spaces are hidden while AdsKeeper is on. Defaults live in `lib/site.ts` and can be overridden in Vercel → Settings → Environment Variables:

| Variable | Where to find it in the widget code |
| --- | --- |
| `NEXT_PUBLIC_ADSKEEPER_SITE_ID` | the number in `https://jsc.adskeeper.com/site/<number>.js` |
| `NEXT_PUBLIC_ADSKEEPER_WIDGET` | the widget's `data-widget-id` |
| `ADS_TXT` (optional) | lines AdsKeeper asks you to add to `/ads.txt`, separated by `\n` |


