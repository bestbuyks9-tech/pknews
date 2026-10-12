# PK Online

A lightweight Albanian-language news front page with separate category pages. The site is a static website, designed for deployment on Vercel through the connected GitHub repository.

## Repository structure

- `index.html`: home page
- `kosovo/index.html`, `politika/index.html`, `ekonomi/index.html`, `bota/index.html`, `sport/index.html`, `teknologji/index.html`: category pages
- `assets/site.css`: shared responsive styling, gray and yellow theme, dark mode
- `assets/site.js`: weather, news feeds, theme/language controls and search

## How it works

- Each top menu item opens a real page URL (for example `/ekonomi/`) instead of scrolling to an element in the home page.
- Headlines are requested from Google News RSS through rss2json and link out to the original publisher. If the feed service is unavailable, publisher links are shown instead.
- Weather data is provided by Open-Meteo for Prishtina.
- Advertisement spaces are visual placeholders. They are not ad network tags and do not generate revenue until an advertising provider is configured.

## Update content

Edit a category page's `data-feed-query` in its `index.html` to change which headlines are requested. Keep the query in quotes and the supported publishers listed in the query. Shared design changes belong in `assets/site.css`; behavior changes belong in `assets/site.js`.

## Deployment

The `main` branch is connected to Vercel. Once changes are merged to `main`, Vercel builds and deploys the static site automatically. Check the production deployment in Vercel if a route is not visible immediately.
