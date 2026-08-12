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
├── privacy/index.html      ← privacy policy, linked from every footer
└── shared/
    └── ledger.css           ← the single shared stylesheet
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
6. Add the analytics tag (see below) and a footer link to
   `/privacy/index.html`.

## Roadmap (coming-soon cards on the hub)

- Should I Make Extra Payments?
- HELOC vs. Cash-Out Refinance
- Rent vs. Buy
- Debt Consolidation Calculator
- Should I Lease or Buy?
- Home Improvement Payback (solar/HVAC/windows)

## Analytics

Umami Cloud, cookieless, one `<script>` tag per page (already present in
all six `index.html` files, before `</head>`). Free tier: 100k
events/month, one website, 6-month retention.

## Privacy policy

`/privacy/index.html` is linked from every page's footer. It reflects
what the site actually does — if analytics, ads, or affiliate links
change, update that page in the same commit.
