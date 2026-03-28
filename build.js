/**
 * Clinevo Blog Build Script
 *
 * Runs at deploy time via: node build.js
 *
 * What it does:
 *   1. Reads index.html and extracts: <nav>, <footer>, <style>, font links,
 *      analytics scripts — so blog pages always match the live site automatically.
 *   2. Reads every .md file in /blog/ (skips .gitkeep and README.md).
 *   3. For each post, generates /blog/posts/[slug].html
 *   4. Generates /blog/index.html (listing of all posts, newest first)
 *
 * Front matter schema (required at the top of each .md file):
 * ---
 * title: "Your Post Title"
 * date: "2026-03-28"
 * description: "One sentence. Used for SEO meta and the blog listing."
 * slug: "your-post-slug"
 * ---
 *
 * The slug becomes the URL: /blog/posts/your-post-slug.html
 */

const fs   = require("fs");
const path = require("path");
const { marked }  = require("marked");
const matter      = require("gray-matter");

const ROOT        = __dirname;
const BLOG_DIR    = path.join(ROOT, "blog");
const POSTS_DIR   = path.join(BLOG_DIR, "posts");
const INDEX_HTML  = path.join(ROOT, "index.html");

// ─── Helpers ────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Extract shared components from index.html ──────────────────────────────
// This means any updates to nav/footer/styles in the real site
// automatically flow through to blog pages on the next deploy.

function extractFromIndex() {
  if (!fs.existsSync(INDEX_HTML)) {
    console.warn("  ⚠  index.html not found — blog pages will render without site nav/footer.");
    return { nav: "", footer: "", headExtras: "" };
  }

  const src = fs.readFileSync(INDEX_HTML, "utf8");

  // Extract <nav>...</nav>
  const navMatch = src.match(/<nav[\s\S]*?<\/nav>/i);
  const nav = navMatch ? navMatch[0] : "";

  // Extract <footer>...</footer>
  // Falls back to everything from <footer> to end of file if closing tag is missing
  const footerMatch = src.match(/<footer[\s\S]*?<\/footer>/i)
    || src.match(/<footer[\s\S]*/i);
  const footer = footerMatch ? footerMatch[0] : "";

  // Extract <style>...</style> block(s)
  const styleBlocks = [];
  const styleRe = /<style[\s\S]*?<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleRe.exec(src)) !== null) {
    styleBlocks.push(styleMatch[0]);
  }

  // Extract Google Fonts <link> tags
  const fontLinks = [];
  const fontRe = /<link[^>]+fonts\.googleapis\.com[^>]*>/gi;
  let fontMatch;
  while ((fontMatch = fontRe.exec(src)) !== null) {
    fontLinks.push(fontMatch[0]);
  }
  // Also grab preconnect hints
  const preconnectRe = /<link[^>]+preconnect[^>]+fonts[^>]*>/gi;
  while ((fontMatch = preconnectRe.exec(src)) !== null) {
    fontLinks.push(fontMatch[0]);
  }

  // Extract analytics <script> tags from <head> (gtag, reb2b, etc.)
  // Only grab scripts before </head> to avoid pulling in page-specific scripts
  const headSection = src.match(/<head[\s\S]*?<\/head>/i)?.[0] || "";
  const analyticsScripts = [];
  const scriptRe = /<script[\s\S]*?<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptRe.exec(headSection)) !== null) {
    const s = scriptMatch[0];
    // Include tracking scripts (gtag, analytics, reb2b) but not JSON-LD or inline app logic
    if (
      s.includes("googletagmanager") ||
      s.includes("gtag(") ||
      s.includes("reb2b") ||
      s.includes("analytics")
    ) {
      analyticsScripts.push(s);
    }
  }

  const headExtras = [
    ...analyticsScripts,
    ...fontLinks,
    ...styleBlocks,
  ].join("\n");

  return { nav, footer, headExtras };
}

// ─── Read markdown files ─────────────────────────────────────────────────────

function readPosts() {
  if (!fs.existsSync(BLOG_DIR)) return [];

  return fs
    .readdirSync(BLOG_DIR)
    .filter(f => f.endsWith(".md") && f !== "README.md")
    .map(filename => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf8");
      const { data, content } = matter(raw);
      const slug = data.slug || filename.replace(/\.md$/, "");
      return {
        slug,
        title:       data.title || slug,
        date:        data.date  || null,
        description: data.description || "",
        html:        marked.parse(content),
      };
    })
    .filter(p => p.title)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// ─── Templates ───────────────────────────────────────────────────────────────

function postPage({ slug, title, date, description, html }, { nav, footer, headExtras }) {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)} | Clinevo Blog</title>
<meta name="description" content="${escHtml(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://clinevo.ai/blog/posts/${slug}.html">
<meta property="og:title" content="${escHtml(title)}">
<meta property="og:description" content="${escHtml(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://clinevo.ai/blog/posts/${slug}.html">
<meta property="og:site_name" content="Clinevo">
${headExtras}
<style>
/* ── Brand kit tokens ── */
:root {
  --b-purple:     #534AB7;
  --b-purple-bg:  #2C2870;
  --b-signal:     #45C4BC;
  --b-forest:     #0F6E56;
  --b-near-black: #0F1923;
  --b-off-white:  #DCE0EC;
  --b-light-bg:   #F0F1F8;
  --b-body-color: #4A5A70;
  --b-border:     rgba(83,74,183,0.1);
  --f-display:    'Outfit', sans-serif;
  --f-body:       'DM Sans', sans-serif;
}

/* ── Blog post layout ── */
.blog-post-wrap {
  padding-top: 100px;
  background: #FAFAFA;
}
.post-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 40px 100px;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 80px;
  align-items: start;
}

/* Breadcrumb */
.post-breadcrumb {
  font-family: var(--f-body);
  font-size: 12px;
  color: var(--b-body-color);
  margin-bottom: 36px;
  letter-spacing: 0.01em;
}
.post-breadcrumb a {
  color: var(--b-purple);
  text-decoration: none;
}
.post-breadcrumb a:hover { text-decoration: underline; }
.post-breadcrumb span { margin: 0 6px; opacity: 0.3; }

/* Post header */
.post-header {
  margin-bottom: 48px;
  padding-bottom: 36px;
  border-bottom: 1px solid var(--b-border);
}
.post-date {
  display: inline-block;
  font-family: var(--f-display);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--b-signal);
  margin-bottom: 18px;
}

/* H1 — Outfit 700 per brand kit */
.post-header h1 {
  font-family: var(--f-display);
  font-size: clamp(26px, 4vw, 42px);
  font-weight: 700;
  letter-spacing: -0.3px;
  line-height: 1.15;
  color: var(--b-near-black);
  margin-bottom: 18px;
}

/* Description — DM Sans 300 */
.post-description {
  font-family: var(--f-body);
  font-size: 18px;
  font-weight: 300;
  color: var(--b-body-color);
  line-height: 1.7;
}

/* Body copy — DM Sans 400, 17px, 1.75 leading */
.post-body p {
  font-family: var(--f-body);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.75;
  color: var(--b-body-color);
  margin-bottom: 22px;
}

/* H2 — Outfit 600 per brand kit */
.post-body h2 {
  font-family: var(--f-display);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.2px;
  line-height: 1.25;
  color: var(--b-near-black);
  margin: 44px 0 16px;
}

/* H3 — DM Sans 600, signal teal per brand kit */
.post-body h3 {
  font-family: var(--f-body);
  font-size: 15px;
  font-weight: 600;
  color: var(--b-signal);
  margin: 32px 0 12px;
}

.post-body strong {
  color: var(--b-near-black);
  font-weight: 600;
}
.post-body a {
  color: var(--b-purple);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.post-body a:hover { color: var(--b-purple-bg); }

.post-body ul, .post-body ol {
  padding-left: 24px;
  margin-bottom: 22px;
}
.post-body li {
  font-family: var(--f-body);
  font-size: 17px;
  line-height: 1.75;
  color: var(--b-body-color);
  margin-bottom: 8px;
}

.post-body hr {
  border: none;
  border-top: 1px solid var(--b-border);
  margin: 48px 0;
}

/* Pull quote — Outfit 300, purple, signal teal left border per brand kit */
.post-body blockquote {
  border-left: 3px solid var(--b-signal);
  padding: 4px 0 4px 18px;
  margin: 32px 0;
}
.post-body blockquote p {
  font-family: var(--f-display);
  font-size: 18px;
  font-weight: 300;
  color: var(--b-purple);
  line-height: 1.55;
  margin-bottom: 0;
  font-style: normal;
}

.post-body code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 13px;
  background: var(--b-light-bg);
  padding: 2px 7px;
  border-radius: 4px;
  color: var(--b-purple);
}
.post-body pre {
  background: var(--b-near-black);
  border-radius: 10px;
  padding: 24px;
  overflow-x: auto;
  margin-bottom: 24px;
}
.post-body pre code {
  background: none;
  color: var(--b-off-white);
  font-size: 14px;
  padding: 0;
}

/* Sidebar */
.post-sidebar {}
.sidebar-card {
  background: #F8F9FC;
  border: 1px solid var(--b-border);
  border-radius: 12px;
  padding: 28px;
  position: sticky;
  top: 100px;
}
.sidebar-card h3 {
  font-family: var(--f-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--b-near-black);
  margin-bottom: 10px;
}
.sidebar-card p {
  font-family: var(--f-body);
  font-size: 13px;
  font-weight: 300;
  color: var(--b-body-color);
  line-height: 1.7;
  margin-bottom: 20px;
}
.sidebar-card .btn { width: 100%; justify-content: center; font-size: 14px; }

@media (max-width: 900px) {
  .post-container { grid-template-columns: 1fr; gap: 40px; padding: 40px 24px 60px; }
  .sidebar-card { position: static; }
  .post-breadcrumb { margin-bottom: 20px; }
}
</style>
</head>
<body>

${nav}

<div class="blog-post-wrap">
  <div class="post-container">
    <main class="post-main">
      <div class="post-breadcrumb">
        <a href="/index.html">Home</a>
        <span>›</span>
        <a href="/blog/index.html">Blog</a>
        <span>›</span>
        ${escHtml(title)}
      </div>
      <header class="post-header">
        ${date ? `<span class="post-date">${formatDate(date)}</span>` : ""}
        <h1>${escHtml(title)}</h1>
        ${description ? `<p class="post-description">${escHtml(description)}</p>` : ""}
      </header>
      <div class="post-body">
        ${html}
      </div>
    </main>

    <aside class="post-sidebar">
      <div class="sidebar-card">
        <h3>Interested in AI for your practice?</h3>
        <p>Book a free 30-minute consultation with Justin. No pitch. No pressure. Just an honest look at where AI can help.</p>
        <a href="/consultation.html" class="btn btn-primary">Book a free consultation &rarr;</a>
      </div>
    </aside>
  </div>
</div>

${footer}

</body>
</html>`;
}

function blogIndexPage(posts, { nav, footer, headExtras }) {
  const postCards = posts.length
    ? posts.map(({ slug, title, date, description }) => `
      <article class="blog-card">
        <a href="/blog/posts/${slug}.html">
          ${date ? `<span class="blog-card-date">${formatDate(date)}</span>` : ""}
          <h2>${escHtml(title)}</h2>
          ${description ? `<p>${escHtml(description)}</p>` : ""}
          <span class="blog-card-link">Read article &rarr;</span>
        </a>
      </article>`).join("\n")
    : `<p class="blog-empty">No posts yet. Check back soon.</p>`;

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blog | Clinevo — Clinical AI Insights</title>
<meta name="description" content="Practical articles on AI for veterinary, optical, and dental practices. No hype. Just what works.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://clinevo.ai/blog/index.html">
<meta property="og:title" content="Blog | Clinevo">
<meta property="og:description" content="Practical articles on AI for veterinary, optical, and dental practices.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://clinevo.ai/blog/index.html">
<meta property="og:site_name" content="Clinevo">
${headExtras}
<style>
/* ── Blog index layout ── */
.blog-index-wrap {
  padding-top: 100px;
  background: #FAFAFA;
}
.blog-index-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 40px 80px;
}
.blog-index-header {
  margin-bottom: 56px;
  padding-bottom: 40px;
  border-bottom: 1px solid rgba(83,74,183,0.1);
}
.blog-index-header .section-tag {
  display: inline-block;
  font-family: 'Outfit', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  background: rgba(83,74,183,0.08);
  color: #534AB7;
  padding: 5px 14px;
  border-radius: 100px;
  margin-bottom: 20px;
}
.blog-index-header h1 {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 700;
  letter-spacing: -0.3px;
  line-height: 1.15;
  color: #0F1923;
  margin-bottom: 14px;
}
.blog-index-header p {
  font-family: 'DM Sans', sans-serif;
  font-size: 17px;
  font-weight: 300;
  color: #4A5A70;
  max-width: 56ch;
  line-height: 1.7;
}
.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.blog-card {
  background: #FFFFFF;
  border: 1px solid rgba(83,74,183,0.1);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.25s;
  box-shadow: 0 1px 3px rgba(83,74,183,0.06);
}
.blog-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 28px rgba(83,74,183,0.1);
  border-color: rgba(83,74,183,0.22);
}
.blog-card a {
  display: block;
  padding: 28px;
  text-decoration: none;
}
.blog-card-date {
  display: block;
  font-family: 'Outfit', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #45C4BC;
  margin-bottom: 12px;
}
.blog-card h2 {
  font-family: 'Outfit', sans-serif;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.2px;
  line-height: 1.3;
  color: #0F1923;
  margin-bottom: 10px;
}
.blog-card p {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 300;
  line-height: 1.7;
  color: #4A5A70;
  margin-bottom: 20px;
}
.blog-card-link {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #534AB7;
}
.blog-empty {
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  color: #4A5A70;
  grid-column: 1 / -1;
}

@media (max-width: 900px) {
  .blog-index-container { padding: 40px 24px 60px; }
  .blog-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>

${nav}

<div class="blog-index-wrap">
  <div class="blog-index-container">
    <header class="blog-index-header">
      <div class="section-tag">Blog</div>
      <h1>Clinical AI Insights</h1>
      <p>Practical articles for practice owners and managers. No hype. Just what actually works.</p>
    </header>
    <div class="blog-grid">
      ${postCards}
    </div>
  </div>
</div>

${footer}

</body>
</html>`;
}

// Escape HTML entities for safe attribute and text insertion
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Main ────────────────────────────────────────────────────────────────────

function build() {
  console.log("🔨 Building Clinevo blog...");

  ensureDir(POSTS_DIR);

  const shared = extractFromIndex();
  console.log(`   nav extracted: ${shared.nav ? "yes" : "no (missing index.html)"}`);
  console.log(`   footer extracted: ${shared.footer ? "yes" : "no"}`);

  const posts = readPosts();
  console.log(`   posts found: ${posts.length}`);

  for (const post of posts) {
    const out = path.join(POSTS_DIR, `${post.slug}.html`);
    fs.writeFileSync(out, postPage(post, shared), "utf8");
    console.log(`   ✓  /blog/posts/${post.slug}.html`);
  }

  const indexOut = path.join(BLOG_DIR, "index.html");
  fs.writeFileSync(indexOut, blogIndexPage(posts, shared), "utf8");
  console.log(`   ✓  /blog/index.html`);

  console.log("✅ Blog build complete.");
}

build();
