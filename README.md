# Orbita

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


