# PK Online

PK Online is a static news portal with original Albanian-language articles hosted within the site.

## Structure
- `index.html`: homepage
- `kosovo/`, `politika/`, `ekonomi/`, `bota/`, `sport/`, `teknologji/`: internal category pages
- `lajme/<slug>/index.html`: full locally hosted article pages
- `kerkimi/index.html`: internal article search page
- `assets/site.css`: shared responsive gray/yellow design
- `assets/site.js`: weather, search, language and theme controls
- `assets/articles.js`: metadata for local search

## Editorial and navigation policy
Navigation, category cards, article cards, search results and related stories link only to PK Online URLs. Information sources are named in article text without outbound links. External RSS headline aggregation is no longer used. Article text is original prose based on identifiable public data, official statements and reporting, with sources and dates stated in each story. Recheck facts and update articles when new developments occur.

The weather panel retrieves current forecast data from Open-Meteo. It does not create a clickable external link. Advertising placements are placeholders; ad-network tags have not been configured.

## Deploy
Changes merged to `main` deploy through Vercel. Every category/article path is a static folder with an `index.html` file.
