# The Ledger

A small library of financial calculators, hosted at shouldirefiornot.com.
Each tool does one thing, shows its math, and requires no account or
backend to work.

## Structure

```
/
├── index.html              ← hub homepage, links to every tool
├── refinance/index.html    ← Should I Refinance?
├── car-loan/index.html     ← Car Loan Ledger (refi + new purchase)
├── pay-points/index.html   ← Should I Pay Points?
├── house-afford/index.html ← How Much House Can I Afford?
├── extra-payments/index.html ← Should I Make Extra Payments?
├── heloc-refi/index.html   ← HELOC vs. Cash-Out Refinance
├── privacy/index.html      ← privacy policy, linked from every footer
├── terms/index.html        ← terms of service, linked from every footer
├── shared/
│   ├── ledger.css           ← the single shared stylesheet
│   └── og-image.png         ← social card, referenced by every page
└── tests/                   ← dev-only, never shipped (see Tests below)
```

## Conventions — read before adding a tool

**One folder per tool, each with its own `index.html`.** This is a
subdirectory structure (`/car-loan/`), not subdomains
(`car-loan.shouldirefiornot.com`) — subdirectories consolidate SEO
authority under one domain; subdomains fragment it. Any static host
(Netlify, Vercel, Cloudflare Pages) serves each folder's `index.html`
automatically at that path with zero configuration.

**No build step, on purpose.** No bundler, no framework, no static site
generator, no npm install. Every page is plain HTML/CSS/vanilla JS that
works by opening the file directly in a browser. This is a deliberate
choice for a project this size — don't introduce tooling to "fix" the
duplication below.

**One shared stylesheet, `shared/ledger.css`.** All color tokens,
typography, and reusable components (cards, nav, stat grids, chips,
toggles, the chart/bar visuals) live there. Every page links to it with
`<link rel="stylesheet" href="../shared/ledger.css">` (or `"shared/ledger.css"`
from the root). Change a color once, every page updates. If a new tool
needs a new component, add it to this file rather than inlining
page-specific CSS.

**The nav bar is intentionally duplicated**, not shared via an include —
there's no templating system to share it with. Copy this block into any
new page, adjusting relative paths for depth:

```html
<div class="site-nav">
  <a href="../index.html" class="site-logo">§ The Ledger</a>
  <a href="../index.html" class="site-nav-link">&larr; All calculators</a>
</div>
```

**Each tool's math is verified before shipping**, not just visually
checked — cross-check the formulas with a plain Node script before
wiring them into the page, and after any shared-CSS change, re-run the
existing tools to confirm nothing regressed.

## Adding a new tool

1. Create `/new-tool-name/index.html`.
2. Link `../shared/ledger.css` and the same Google Fonts `<link>` tags
   used elsewhere.
3. Copy the nav block above.
4. Reuse existing components from `shared/ledger.css` (`.card`,
   `.field-grid`, `.stat-grid`, `.term-toggle`, `.chip-row`, etc.) before
   inventing new ones.
5. Add a card for it on the hub (`index.html`), and remove/replace its
   "coming soon" placeholder if one exists.
6. Add the analytics tag (see below) and footer links to
   `/privacy/index.html` and `/terms/index.html`.
7. Add a `<section class="faq">` between the result card and the footer
   (see **FAQ blocks** below).

## Roadmap (coming-soon cards on the hub)

- Rent vs. Buy
- Debt Consolidation Calculator
- Should I Lease or Buy?
- Home Improvement Payback (solar/HVAC/windows)

## Analytics

Umami Cloud, cookieless, one `<script>` tag per page (already present in
all nine `index.html` files, before `</head>`). Free tier: 100k
events/month, one website, 6-month retention.

## Tests

`tests/` holds the verification harness. **It is dev-only and does not
change the "no build step" rule above** — the site still ships as plain
files, and nothing in `tests/` is referenced by any page.

```
tests/
├── extra-payments.math.js  ← reference math, standalone Node, no deps
├── heloc-refi.math.js      ← reference math, standalone Node, no deps
├── scenarios.js            ← shared input fixtures for both of the above
├── run-math.js             ← prints reference output for every scenario
├── dom.test.js             ← loads the real pages in jsdom, asserts the
│                             rendered output matches the reference math
└── link-check.js           ← resolves every internal link, checks the hub
                              tool cards, sitemap.xml, SEO/OG heads, the
                              legal pages and every FAQ block
```

Run them:

```
node tests/run-math.js                  # no dependencies
npm install --no-save jsdom             # dev only, gitignored
node tests/dom.test.js
node tests/link-check.js
```

`--no-save` is deliberate: there is no `package.json` and there should
not be one. jsdom is a local convenience for running the tests, not a
project dependency.

When you add a tool, add its scenarios to `tests/scenarios.js` and a
reference math module beside the existing two. The math modules are the
source of truth — the inline page JS must reproduce them exactly, and
`dom.test.js` is what proves it.

## Legal pages

`/privacy/index.html` and `/terms/index.html` are linked from every
page's footer. Privacy reflects what the site actually does — if
analytics, ads, or affiliate links change, update that page in the same
commit. Both pages share the `.legal` / `.toc` / `.short-version` inline
style block; keep them in sync when either changes.

## FAQ blocks

Every calculator carries a short FAQ between its result card and its
footer:

```html
<section class="faq">
  <h2 class="section-label">Common questions</h2>
  <details>
    <summary>Question?</summary>
    <p>Answer.</p>
  </details>
</section>
```

Native `<details>`/`<summary>` — no JS, consistent with the no-build-step
rule. `.faq` is styled once in `shared/ledger.css`; don't re-declare it
inline on a page. **Answers must describe what the calculator actually
does.** Several pages have dedicated inputs for things a generic FAQ
would claim are excluded (car-loan has a sales tax field, house-afford
has tax/insurance/HOA fields), and `link-check.js` cannot catch a
plausible-but-wrong answer — re-read the fields before writing one.
