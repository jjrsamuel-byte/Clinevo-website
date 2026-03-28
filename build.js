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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function extractFromIndex() {
  if (!fs.existsSync(INDEX_HTML)) {
    console.warn("  ⚠  index.html not found — blog pages will render without site nav/footer.");
    return { nav: "", footer: "", headExtras: "" };
  }

  const src = fs.readFileSync(INDEX_HTML, "utf8");

  const navMatch = src.match(/<nav[\s\S]*?<\/nav>/i);
  const nav = navMatch ? navMatch[0] : "";

  const footerMatch = src.match(/<footer[\s\S]*?<\/footer>/i)
    || src.match(/<footer[\s\S]*/i);
  const footer = footerMatch ? footerMatch[0] : "";

  const styleBlocks = [];
  const styleRe = /<style[\s\S]*?<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleRe.exec(src)) !== null) {
    styleBlocks.push(styleMatch[0]);
  }

  const fontLinks = [];
  const fontRe = /<link[^>]+fonts\.googleapis\.com[^>]*>/gi;
  let fontMatch;
  while ((fontMatch = fontRe.exec(src)) !== null) {
    fontLinks.push(fontMatch[0]);
  }
  const preconnectRe = /<link[^>]+preconnect[^>]+fonts[^>]*>/gi;
  while ((fontMatch = preconnectRe.exec(src)) !== null) {
    fontLinks.push(fontMatch[0]);
  }

  const headSection = src.match(/<head[\s\S]*?<\/head>/i)?.[0] || "";
  const analyticsScripts = [];
  const scriptRe = /<script[\s\S]*?<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptRe.exec(headSection)) !== null) {
    const s = scriptMatch[0];
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
.blog-post-wrap { padding-top: 100px; }
.post-container {
  max-width: 1200px; margin: 0 auto;
  padding: 60px 40px 80px;
  display: grid; grid-template-columns: 1fr 320px;
  gap: 80px; align-items: start;
}
.post-breadcrumb { font-size: 13px; color: var(--text-secondary, #4A5568); margin-bottom: 32px; }
.post-breadcrumb a { color: var(--clinevo-purple, #534AB7); text-decoration: none; }
.post-breadcrumb a:hover { text-decoration: underline; }
.post-breadcrumb span { margin: 0 6px; opacity: 0.4; }
.post-header { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid var(--border-light, rgba(83,74,183,0.08)); }
.post-date { display: inline-block; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--signal-teal, #45C4BC); margin-bottom: 16px; }
.post-header h1 { font-size: clamp(28px, 4vw, 44px); font-weight: 700; letter-spacing: -0.8px; line-height: 1.15; color: var(--near-black, #0F1923); margin-bottom: 16px; }
.post-description { font-size: 18px; color: var(--text-secondary, #4A5568); line-height: 1.7; font-weight: 300; }
.post-body h2 { font-size: 24px; font-weight: 700; letter-spacing: -0.4px; line-height: 1.25; color: var(--near-black, #0F1923); margin: 40px 0 16px; }
.post-body h3 { font-size: 19px; font-weight: 600; color: var(--near-black, #0F1923); margin: 32px 0 12px; }
.post-body p { font-size: 16px; line-height: 1.8; color: var(--text-secondary, #4A5568); margin-bottom: 20px; }
.post-body strong { color: var(--near-black, #0F1923); font-weight: 600; }
.post-body a { color: var(--clinevo-purple, #534AB7); text-decoration: underline; text-underline-offset: 3px; }
.post-body ul, .post-body ol { padding-left: 24px; margin-bottom: 20px; }
.post-body li { font-size: 16px; line-height: 1.8; color: var(--text-secondary, #4A5568); margin-bottom: 6px; }
.post-body hr { border: none; border-top: 1px solid var(--border-light, rgba(83,74,183,0.08)); margin: 40px 0; }
.post-body blockquote { border-left: 3px solid var(--clinevo-purple, #534AB7); padding: 12px 20px; margin: 24px 0; background: rgba(83,74,183,0.04); border-radius: 0 8px 8px 0; }
.post-body blockquote p { margin-bottom: 0; font-style: italic; }
.post-body code { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; background: var(--bg-panel, #F4F5F9); padding: 2px 6px; border-radius: 4px; color: var(--clinevo-purple, #534AB7); }
.post-body pre { background: var(--near-black, #0F1923); border-radius: 10px; padding: 24px; overflow-x: auto; margin-bottom: 24px; }
.post-body pre code { background: none; color: var(--off-white, #DCE0EC); font-size: 14px; padding: 0; }
.post-sidebar {}
.sidebar-card { background: var(--bg-panel, #F4F5F9); border: 1px solid var(--border-light, rgba(83,74,183,0.08)); border-radius: 16px; padding: 28px; position: sticky; top: 100px; }
.sidebar-card h3 { font-size: 16px; font-weight: 700; color: var(--near-black, #0F1923); margin-bottom: 8px; }
.sidebar-card p { font-size: 14px; color: var(--text-secondary, #4A5568); line-height: 1.65; margin-bottom: 20px; }
.sidebar-card .btn { width: 100%; justify-content: center; font-size: 14px; }
@media (max-width: 900px) {
  .post-container { grid-template-columns: 1fr; gap: 40px; padding: 40px 24px 60px; }
  .sidebar-card { position: static; }
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
.blog-index-wrap { padding-top: 100px; }
.blog-index-container { max-width: 1200px; margin: 0 auto; padding: 60px 40px 80px; }
.blog-index-header { margin-bottom: 56px; padding-bottom: 40px; border-bottom: 1px solid var(--border-light, rgba(83,74,183,0.08)); }
.blog-index-header .section-tag { display: inline-block; background: rgba(83,74,183,0.08); color: var(--clinevo-purple, #534AB7); font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; padding: 4px 14px; border-radius: 100px; margin-bottom: 20px; }
.blog-index-header h1 { font-size: clamp(32px, 5vw, 52px); font-weight: 700; letter-spacing: -1px; color: var(--near-black, #0F1923); margin-bottom: 16px; }
.blog-index-header p { font-size: 17px; color: var(--text-secondary, #4A5568); max-width: 56ch; line-height: 1.7; font-weight: 300; }
.blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
.blog-card { background: var(--bg-panel, #F4F5F9); border: 1px solid var(--border-light, rgba(83,74,183,0.08)); border-radius: 16px; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s; }
.blog-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(83,74,183,0.1); border-color: rgba(83,74,183,0.2); }
.blog-card a { display: block; padding: 28px; text-decoration: none; }
.blog-card-date { display: block; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--signal-teal, #45C4BC); margin-bottom: 12px; }
.blog-card h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.3; color: var(--near-black, #0F1923); margin-bottom: 10px; }
.blog-card p { font-size: 14px; line-height: 1.7; color: var(--text-secondary, #4A5568); margin-bottom: 20px; font-weight: 300; }
.blog-card-link { font-size: 13px; font-weight: 600; color: var(--clinevo-purple, #534AB7); }
.blog-empty { font-size: 15px; color: var(--text-secondary, #4A5568); grid-column: 1 / -1; }
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

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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
