---
name: lt-seo-testing
description: "Technical SEO testing playbook for websites in a LambdaTest QA run: titles, meta, canonical, robots, sitemap, hreflang, structured data, headings, alt text, broken links, social tags, mobile rendering. Mostly scriptable via direct HTTP fetches. Used by the lambdatest-qa agent."
---

# SEO testing (technical)

Run by fetching pages directly (no grid needed); use LambdaTest only to confirm mobile rendering of key pages.

## Per-page checks
| Check | Rule |
|---|---|
| Status | 200 (no redirect chains > 1 hop; no soft 404s) |
| `<title>` | exactly one, 30–60 chars, unique across pages |
| Meta description | 70–160 chars, unique |
| Canonical | present, absolute, self-referencing or intentional, returns 200 |
| Robots meta / X-Robots-Tag | no `noindex`/`nofollow` unless intended |
| H1 | exactly one; logical H2–H6 order |
| Images | all have `alt` (empty only for decorative); reasonable file names |
| Links | internal links 2xx; no 4xx/5xx; external broken links listed separately |
| Structured data | JSON-LD parses; types fit the page (Organization, Product, Article, BreadcrumbList, FAQ); required props present |
| Open Graph / Twitter | `og:title`, `og:description`, `og:image` (reachable), `og:url`, `twitter:card` |
| hreflang | if multilingual: reciprocal, valid codes, x-default |
| Viewport meta | present (`width=device-width, initial-scale=1`) |
| Mobile rendering | main content visible on real mobile device (from responsive run) |
| HTTPS | https only, http → https 301, no mixed content |

## Site-wide checks
- `robots.txt` reachable, doesn't block key pages/CSS/JS, references the sitemap.
- `sitemap.xml` valid XML, URLs return 200, no noindex/redirected URLs in it, lastmod sane.
- Duplicate titles/descriptions across pages; orphan pages (in sitemap but not linked).
- `www`/non-`www` and trailing-slash variants redirect to one canonical host.

## How
Node script (fetch + an HTML parser like `cheerio` installed in the run folder) or curl; throttle to ≤ 2 requests/second, honour robots.txt for the crawl, cap at the page list from the plan (or depth-2 crawl ≤ 200 URLs).

## TC patterns
`TC-SEO-###` — "All in-scope pages have unique titles 30–60 chars", "0 broken internal links", "Product pages have valid Product JSON-LD".

## Pass/fail & severity
Pass when all checks hold. `noindex` on a key page or robots.txt blocking the site = Critical; broken internal links / missing canonical / duplicate titles = Medium; length issues / missing OG = Low.

## Report section — "SEO"
Checklist per page (✅/❌) · site-wide results · broken links list (source → target → status) · structured-data findings · prioritised fixes.
