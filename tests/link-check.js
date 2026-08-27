// Verifies every internal link in every page resolves to a file that exists,
// that both new calculators are reachable from the index tool grid and reachable
// back via their nav bars, that sitemap.xml matches the pages on disk, and that
// each page carries the full SEO/OG head block, that the terms page matches the
// same head/nav/footer contract, and that every calculator carries a FAQ block
// styled only from the shared stylesheet.
//
//   node tests/link-check.js

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.shouldirefiornot.com';

let passed = 0, failed = 0;
const failures = [];

function ok(label){ passed++; }
function bad(label, detail){ failed++; failures.push('  ' + label + (detail ? '\n      ' + detail : '')); }
function assert(cond, label, detail){ cond ? ok(label) : bad(label, detail); }

// --- collect every html file, ignoring dev-only dirs ---
function walk(dir, acc){
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })){
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'tests') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.html')) acc.push(path.relative(ROOT, full).split(path.sep).join('/'));
  }
  return acc;
}
const pages = walk(ROOT, []).sort();
console.log('Pages found (' + pages.length + '): ' + pages.join(', ') + '\n');

// --- 1. every relative href/src resolves ---
console.log('--- internal link resolution ---');
let linkCount = 0;
for (const page of pages){
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, page), 'utf8'));
  const doc = dom.window.document;
  const dir = path.dirname(path.join(ROOT, page));

  doc.querySelectorAll('[href], [src]').forEach(el => {
    const raw = el.getAttribute('href') || el.getAttribute('src');
    if (!raw) return;
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('data:')) return;
    linkCount++;
    const target = path.resolve(dir, raw.split('#')[0].split('?')[0]);
    assert(fs.existsSync(target), page + '  ->  ' + raw, 'resolved to missing path: ' + target);
  });
}
console.log('  checked ' + linkCount + ' relative links across ' + pages.length + ' pages');

// --- 2. the two new calculators are linked from the index tool grid ---
console.log('\n--- index.html tool grid ---');
const indexDom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
const indexDoc = indexDom.window.document;

for (const slug of ['extra-payments', 'heloc-refi']){
  const card = indexDoc.querySelector('a.tool-card[href="' + slug + '/index.html"]');
  assert(!!card, 'tool card links to ' + slug + '/index.html');
  if (!card) continue;
  assert(!!card.querySelector('.tool-card-tag'),   slug + ' card has a tag');
  assert(!!card.querySelector('.tool-card-title'), slug + ' card has a title');
  assert(!!card.querySelector('.tool-card-desc'),  slug + ' card has a description');
  const cta = card.querySelector('.tool-card-cta');
  assert(!!cta && /Open calculator/.test(cta.textContent), slug + ' card has the "Open calculator" CTA',
         cta ? 'cta text: ' + JSON.stringify(cta.textContent) : 'no .tool-card-cta');
  assert(!card.classList.contains('soon'), slug + ' card is no longer marked "coming soon"');
  console.log('  ' + slug + ' -> "' + card.querySelector('.tool-card-title').textContent.trim() + '"');
}

// no stale "coming soon" placeholder left for either calculator
indexDoc.querySelectorAll('.tool-card.soon .tool-card-title').forEach(t => {
  const txt = t.textContent.toLowerCase();
  assert(!/extra payments|heloc|cash-out/.test(txt),
         'no leftover "coming soon" card for the new calculators', 'found: ' + t.textContent.trim());
});

// --- 3. nav bars on the new pages point back to real files ---
console.log('\n--- nav bars on new pages ---');
for (const slug of ['extra-payments', 'heloc-refi']){
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, slug, 'index.html'), 'utf8'));
  const doc = dom.window.document;
  const logo = doc.querySelector('.site-nav .site-logo');
  const back = doc.querySelector('.site-nav .site-nav-link');
  assert(!!logo && logo.getAttribute('href') === '../index.html', slug + ' nav logo -> ../index.html');
  assert(!!back && back.getAttribute('href') === '../index.html', slug + ' nav back-link -> ../index.html');
  const privacy = doc.querySelector('footer a[href="../privacy/index.html"]');
  assert(!!privacy, slug + ' footer -> ../privacy/index.html');
  const css = doc.querySelector('link[rel="stylesheet"][href="../shared/ledger.css"]');
  assert(!!css, slug + ' uses shared/ledger.css');
  const extraSheets = [...doc.querySelectorAll('link[rel="stylesheet"]')]
    .map(l => l.getAttribute('href'))
    .filter(h => h && !h.includes('fonts.googleapis.com') && h !== '../shared/ledger.css');
  assert(extraSheets.length === 0, slug + ' introduces no additional stylesheets',
         'found: ' + JSON.stringify(extraSheets));
  console.log('  ' + slug + ' nav + footer + stylesheet OK');
}

// --- 4. sitemap matches disk ---
console.log('\n--- sitemap.xml ---');
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

for (const loc of locs){
  const rel = loc.replace(SITE, '').replace(/^\//, '');
  const target = path.join(ROOT, rel, 'index.html');
  assert(fs.existsSync(target), 'sitemap loc resolves: ' + loc, 'missing ' + target);
}
for (const slug of ['extra-payments', 'heloc-refi']){
  const url = SITE + '/' + slug + '/';
  assert(locs.includes(url), 'sitemap contains ' + url);
  const block = sitemap.match(new RegExp('<url>\\s*<loc>' + url.replace(/[/.]/g, '\\$&') + '</loc>([\\s\\S]*?)</url>'));
  assert(!!block, slug + ' has a sitemap <url> block');
  if (block){
    assert(/<lastmod>2026-08-25<\/lastmod>/.test(block[1]), slug + ' sitemap lastmod is 2026-08-25',
           'block: ' + block[1].trim());
    assert(/<changefreq>monthly<\/changefreq>/.test(block[1]), slug + ' sitemap changefreq is monthly');
    assert(/<priority>0\.8<\/priority>/.test(block[1]), slug + ' sitemap priority is 0.8');
  }
}
// every calculator page on disk is in the sitemap
for (const page of pages){
  const dir = path.dirname(page);
  const url = dir === '.' ? SITE + '/' : SITE + '/' + dir + '/';
  assert(locs.includes(url), 'page is listed in sitemap: ' + page, 'expected loc ' + url);
}
console.log('  ' + locs.length + ' sitemap entries, all resolve and all pages are listed');

// --- 5. SEO / OG head block on the new pages ---
console.log('\n--- SEO / OG head blocks ---');
const OG_IMAGE = SITE + '/shared/og-image.png';
for (const slug of ['extra-payments', 'heloc-refi']){
  const page = slug + '/index.html';
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, page), 'utf8'));
  const doc = dom.window.document;
  const meta = (sel, attr) => { const el = doc.querySelector(sel); return el ? el.getAttribute(attr) : null; };

  const canonical = meta('link[rel="canonical"]', 'href');
  assert(canonical === SITE + '/' + slug + '/', slug + ' canonical', 'got ' + canonical);

  const title = doc.querySelector('title');
  assert(!!title && title.textContent.trim().length > 0, slug + ' has a <title>');
  assert(!!meta('meta[name="description"]', 'content'), slug + ' has a meta description');

  assert(!!meta('meta[property="og:title"]', 'content'), slug + ' og:title');
  assert(!!meta('meta[property="og:description"]', 'content'), slug + ' og:description');
  assert(meta('meta[property="og:url"]', 'content') === SITE + '/' + slug + '/', slug + ' og:url');
  assert(meta('meta[property="og:type"]', 'content') === 'website', slug + ' og:type');
  assert(meta('meta[property="og:site_name"]', 'content') === 'The Ledger', slug + ' og:site_name');
  assert(meta('meta[property="og:image"]', 'content') === OG_IMAGE, slug + ' og:image',
         'got ' + meta('meta[property="og:image"]', 'content'));
  assert(meta('meta[property="og:image:width"]', 'content') === '1200', slug + ' og:image:width');
  assert(meta('meta[property="og:image:height"]', 'content') === '630', slug + ' og:image:height');
  assert(meta('meta[name="twitter:card"]', 'content') === 'summary_large_image', slug + ' twitter:card');
  assert(!!meta('meta[name="twitter:title"]', 'content'), slug + ' twitter:title');
  assert(!!meta('meta[name="twitter:description"]', 'content'), slug + ' twitter:description');

  // og:image must point at a file that actually exists
  assert(fs.existsSync(path.join(ROOT, 'shared', 'og-image.png')), slug + ' og:image file exists on disk');

  // exactly one of each image tag, matching the other pages
  const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
  for (const tag of ['og:image"', 'og:image:width', 'og:image:height']){
    const n = src.split(tag).length - 1;
    assert(n === 1, slug + ' has exactly one ' + tag.replace('"', '') + ' tag', 'found ' + n);
  }
  console.log('  ' + slug + ' head block complete');
}

// --- 6. terms page head block, nav and legal structure ---
console.log('\n--- terms page ---');
{
  const page = 'terms/index.html';
  assert(fs.existsSync(path.join(ROOT, page)), 'terms/index.html exists');
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, page), 'utf8'));
  const doc = dom.window.document;
  const meta = (sel, attr) => { const el = doc.querySelector(sel); return el ? el.getAttribute(attr) : null; };

  assert(meta('link[rel="canonical"]', 'href') === SITE + '/terms/', 'terms canonical',
         'got ' + meta('link[rel="canonical"]', 'href'));
  assert(!!doc.querySelector('title'), 'terms has a <title>');
  assert(!!meta('meta[name="description"]', 'content'), 'terms has a meta description');
  assert(!!meta('meta[property="og:title"]', 'content'), 'terms og:title');
  assert(!!meta('meta[property="og:description"]', 'content'), 'terms og:description');
  assert(meta('meta[property="og:url"]', 'content') === SITE + '/terms/', 'terms og:url');
  assert(meta('meta[property="og:type"]', 'content') === 'website', 'terms og:type');
  assert(meta('meta[property="og:site_name"]', 'content') === 'The Ledger', 'terms og:site_name');
  assert(meta('meta[property="og:image"]', 'content') === OG_IMAGE, 'terms og:image');
  assert(meta('meta[property="og:image:width"]', 'content') === '1200', 'terms og:image:width');
  assert(meta('meta[property="og:image:height"]', 'content') === '630', 'terms og:image:height');
  assert(meta('meta[name="twitter:card"]', 'content') === 'summary_large_image', 'terms twitter:card');
  assert(!!meta('meta[name="twitter:title"]', 'content'), 'terms twitter:title');
  assert(!!meta('meta[name="twitter:description"]', 'content'), 'terms twitter:description');

  // same nav + stylesheet contract as every other page
  const logo = doc.querySelector('.site-nav .site-logo');
  const back = doc.querySelector('.site-nav .site-nav-link');
  assert(!!logo && logo.getAttribute('href') === '../index.html', 'terms nav logo -> ../index.html');
  assert(!!back && back.getAttribute('href') === '../index.html', 'terms nav back-link -> ../index.html');
  assert(!!doc.querySelector('link[rel="stylesheet"][href="../shared/ledger.css"]'), 'terms uses shared/ledger.css');
  assert(!!doc.querySelector('footer a[href="../privacy/index.html"]'), 'terms footer -> ../privacy/index.html');

  // every table-of-contents anchor points at a heading that exists on the page
  const anchors = [...doc.querySelectorAll('.toc a')];
  assert(anchors.length === 9, 'terms table of contents has 9 entries', 'found ' + anchors.length);
  for (const a of anchors){
    const id = a.getAttribute('href').slice(1);
    assert(!!doc.getElementById(id), 'terms toc anchor #' + id + ' resolves to a heading');
  }
  const headings = [...doc.querySelectorAll('.legal h2')];
  assert(headings.length === 9, 'terms has 9 numbered sections', 'found ' + headings.length);
  assert(headings.every(h => h.textContent.trim().length > 0), 'terms sections are all non-empty');
  console.log('  terms head block, nav, footer and ' + headings.length + ' sections OK');
}

// --- 7. Terms link in the footer nav of every page ---
console.log('\n--- footer nav: Privacy + Terms ---');
for (const page of pages){
  const dir = path.dirname(page);
  const depth = dir === '.' ? '' : '../';
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, page), 'utf8'));
  const doc = dom.window.document;
  const footer = doc.querySelector('footer');
  assert(!!footer, page + ' has a footer');
  if (!footer) continue;

  if (page !== 'terms/index.html'){
    assert(!!footer.querySelector('a[href="' + depth + 'terms/index.html"]'),
           page + ' footer links to terms', 'footer html: ' + footer.innerHTML.trim());
  }
  if (page !== 'privacy/index.html'){
    assert(!!footer.querySelector('a[href="' + depth + 'privacy/index.html"]'),
           page + ' footer links to privacy');
  }
  // a page should never link to itself in its own footer
  if (dir !== '.'){
    assert(!footer.querySelector('a[href="' + depth + dir + '/index.html"]'),
           page + ' footer does not self-link');
  }
}
console.log('  ' + pages.length + ' footers carry both legal links');

// --- 8. FAQ blocks on every calculator page ---
console.log('\n--- FAQ blocks ---');
const CALCS = ['refinance', 'car-loan', 'pay-points', 'house-afford', 'extra-payments', 'heloc-refi'];
for (const slug of CALCS){
  const page = slug + '/index.html';
  const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const dom = new JSDOM(src);
  const doc = dom.window.document;
  const NODE = dom.window.Node;

  const faqs = doc.querySelectorAll('section.faq');
  assert(faqs.length === 1, slug + ' has exactly one section.faq', 'found ' + faqs.length);
  if (faqs.length !== 1) continue;
  const faq = faqs[0];

  const h2 = faq.querySelector('h2.section-label');
  assert(!!h2 && /Common questions/i.test(h2.textContent), slug + ' FAQ has the "Common questions" heading');

  const details = [...faq.querySelectorAll('details')];
  assert(details.length >= 3, slug + ' FAQ has at least 3 entries', 'found ' + details.length);
  details.forEach((d, i) => {
    const summary = d.querySelector('summary');
    const answer = d.querySelector('p');
    assert(!!summary && summary.textContent.trim().length > 10,
           slug + ' FAQ #' + (i + 1) + ' has a real question');
    assert(!!answer && answer.textContent.trim().length > 40,
           slug + ' FAQ #' + (i + 1) + ' has a real answer');
    assert(!d.hasAttribute('open'), slug + ' FAQ #' + (i + 1) + ' starts collapsed');
  });

  // the FAQ must sit between the result card and the footer, and must not
  // introduce ids or scripts that could collide with the calculator
  const resultCard = doc.getElementById('resultCard');
  assert(!!resultCard, slug + ' still has #resultCard');
  if (resultCard){
    assert(!!(resultCard.compareDocumentPosition(faq) & NODE.DOCUMENT_POSITION_FOLLOWING),
           slug + ' FAQ comes after #resultCard');
  }
  const footer = doc.querySelector('footer');
  assert(!!footer && !!(faq.compareDocumentPosition(footer) & NODE.DOCUMENT_POSITION_FOLLOWING),
         slug + ' FAQ comes before the footer');
  assert(faq.querySelectorAll('[id]').length === 0, slug + ' FAQ introduces no ids');
  assert(faq.querySelectorAll('script, style, input, button').length === 0,
         slug + ' FAQ introduces no scripts, styles or form controls');
  assert(!!faq.parentElement && faq.parentElement.classList.contains('stage'),
         slug + ' FAQ is a direct child of .stage, not nested in a card');

  console.log('  ' + slug + ' -> ' + details.length + ' questions, placed after #resultCard');
}

// --- 9. .faq is styled once, in the shared stylesheet only ---
console.log('\n--- .faq lives in shared/ledger.css ---');
{
  const css = fs.readFileSync(path.join(ROOT, 'shared', 'ledger.css'), 'utf8');
  assert(/\.faq\{/.test(css), 'shared/ledger.css defines .faq');
  assert(/\.faq summary\{/.test(css), 'shared/ledger.css styles .faq summary');
  assert(/\.faq details\[open\] summary::after/.test(css), 'shared/ledger.css styles the open state');
  for (const slug of CALCS){
    const src = fs.readFileSync(path.join(ROOT, slug, 'index.html'), 'utf8');
    assert(!/<style[\s\S]*?\.faq[\s\S]*?<\/style>/.test(src), slug + ' does not re-style .faq inline');
  }
  console.log('  .faq defined once in the shared stylesheet, no inline duplicates');
}

console.log('\n==================================================');
console.log(' Link/SEO assertions passed: ' + passed + ', failed: ' + failed);
if (failed){
  console.log('\nFAILURES:\n' + failures.join('\n'));
  process.exit(1);
}
console.log(' ALL LINK + SEO CHECKS PASSED');
