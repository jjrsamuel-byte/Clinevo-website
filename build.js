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
        illustration: data.illustration || "default",
        illustrationPosition: data.illustrationPosition || "top",
        sectorTag:   data.sectorTag || "Veterinary",
        topicTag:    data.topicTag || data.tag || "Clinical AI",
        html:        marked.parse(content),
      };
    })
    .filter(p => p.title)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// ─── Templates ───────────────────────────────────────────────────────────────

// ─── Illustration SVGs ──────────────────────────────────────────────────────

const ILLUSTRATIONS = {
  default: `<svg viewBox="0 0 600 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="40" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="80" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="120" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="160" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="200" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="240" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="280" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="320" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="360" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="400" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="440" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="480" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="520" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="560" cy="40" r="1.5" fill="rgba(83,74,183,0.2)"/>
          <circle cx="40" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="80" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="120" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="160" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="200" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="240" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="280" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="320" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="360" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="400" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="440" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="480" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="520" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="560" cy="80" r="1.5" fill="rgba(83,74,183,0.2)"/>
          <circle cx="40" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="80" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="120" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="160" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="200" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="240" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="280" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="320" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="360" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="400" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="440" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="520" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="560" cy="120" r="1.5" fill="rgba(83,74,183,0.2)"/>
          <circle cx="40" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="80" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="120" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="160" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="200" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="240" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="280" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="320" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="360" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="400" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="440" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="480" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="520" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/><circle cx="560" cy="160" r="1.5" fill="rgba(83,74,183,0.2)"/>
          <line x1="110" y1="100" x2="190" y2="100" stroke="rgba(83,74,183,0.25)" stroke-width="1.5" stroke-dasharray="4 3"/>
          <line x1="250" y1="100" x2="330" y2="100" stroke="rgba(83,74,183,0.25)" stroke-width="1.5" stroke-dasharray="4 3"/>
          <line x1="390" y1="100" x2="470" y2="100" stroke="rgba(83,74,183,0.25)" stroke-width="1.5" stroke-dasharray="4 3"/>
          <path d="M 60 160 A 80 80 0 0 1 60 40" stroke="rgba(83,74,183,0.18)" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M 70 155 A 65 65 0 0 1 70 45" stroke="rgba(83,74,183,0.12)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <circle cx="80" cy="100" r="28" fill="rgba(83,74,183,0.07)" stroke="rgba(83,74,183,0.3)" stroke-width="1.5"/>
          <circle cx="80" cy="100" r="18" fill="rgba(83,74,183,0.1)" stroke="rgba(83,74,183,0.5)" stroke-width="1.5"/>
          <circle cx="80" cy="100" r="7" fill="#534AB7"/>
          <path d="M195 97 L210 100 L195 103" fill="rgba(83,74,183,0.4)"/>
          <circle cx="220" cy="100" r="28" fill="rgba(69,196,188,0.06)" stroke="rgba(69,196,188,0.3)" stroke-width="1.5"/>
          <path d="M 208 84 A 20 20 0 0 1 232 84" stroke="#45C4BC" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M 208 116 A 20 20 0 0 0 232 116" stroke="#45C4BC" stroke-width="2" fill="none" stroke-linecap="round"/>
          <circle cx="220" cy="100" r="8" fill="none" stroke="#45C4BC" stroke-width="2"/>
          <circle cx="220" cy="100" r="3" fill="#45C4BC"/>
          <path d="M335 97 L350 100 L335 103" fill="rgba(83,74,183,0.4)"/>
          <circle cx="360" cy="100" r="30" fill="rgba(83,74,183,0.06)" stroke="rgba(83,74,183,0.2)" stroke-width="1"/>
          <circle cx="360" cy="100" r="22" fill="rgba(83,74,183,0.08)" stroke="rgba(83,74,183,0.35)" stroke-width="1.5"/>
          <circle cx="360" cy="100" r="14" fill="rgba(83,74,183,0.12)" stroke="#534AB7" stroke-width="1.5"/>
          <circle cx="360" cy="100" r="6" fill="#534AB7"/>
          <circle cx="360" cy="70" r="4" fill="rgba(69,196,188,0.7)" stroke="#45C4BC" stroke-width="1"/>
          <circle cx="386" cy="88" r="3" fill="rgba(69,196,188,0.5)" stroke="#45C4BC" stroke-width="1"/>
          <circle cx="334" cy="88" r="3" fill="rgba(69,196,188,0.5)" stroke="#45C4BC" stroke-width="1"/>
          <line x1="360" y1="94" x2="360" y2="74" stroke="rgba(69,196,188,0.4)" stroke-width="1"/>
          <line x1="366" y1="95" x2="383" y2="91" stroke="rgba(69,196,188,0.4)" stroke-width="1"/>
          <line x1="354" y1="95" x2="337" y2="91" stroke="rgba(69,196,188,0.4)" stroke-width="1"/>
          <path d="M475 97 L490 100 L475 103" fill="rgba(83,74,183,0.4)"/>
          <circle cx="510" cy="100" r="28" fill="rgba(15,110,86,0.07)" stroke="rgba(15,110,86,0.3)" stroke-width="1.5"/>
          <circle cx="510" cy="100" r="18" fill="rgba(15,110,86,0.1)" stroke="rgba(15,110,86,0.5)" stroke-width="1.5"/>
          <path d="M500 100 L507 108 L522 90" stroke="#0F6E56" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M 530 40 A 50 50 0 0 1 580 90" stroke="rgba(69,196,188,0.25)" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M 540 40 A 38 38 0 0 1 578 78" stroke="rgba(69,196,188,0.15)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <circle cx="150" cy="55" r="5" fill="none" stroke="rgba(69,196,188,0.4)" stroke-width="1.5"/><circle cx="150" cy="55" r="2" fill="rgba(69,196,188,0.4)"/>
          <circle cx="290" cy="60" r="4" fill="none" stroke="rgba(83,74,183,0.3)" stroke-width="1.5"/>
          <circle cx="430" cy="148" r="5" fill="none" stroke="rgba(69,196,188,0.35)" stroke-width="1.5"/><circle cx="430" cy="148" r="2" fill="rgba(69,196,188,0.35)"/>
          <circle cx="170" cy="145" r="4" fill="none" stroke="rgba(83,74,183,0.25)" stroke-width="1.5"/>
          <text x="80" y="140" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="9" fill="rgba(83,74,183,0.5)" font-weight="600" letter-spacing="0.5">INTAKE</text>
          <text x="220" y="140" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="9" fill="rgba(69,196,188,0.7)" font-weight="600" letter-spacing="0.5">WORKFLOW</text>
          <text x="360" y="142" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="9" fill="rgba(83,74,183,0.5)" font-weight="600" letter-spacing="0.5">AI LAYER</text>
          <text x="510" y="140" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="9" fill="rgba(15,110,86,0.5)" font-weight="600" letter-spacing="0.5">OUTCOME</text>
        </svg>`,

  compliance: `<svg viewBox="0 0 600 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <!-- Dot grid background -->
          <circle cx="40" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="80" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="120" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="160" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="200" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="240" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="280" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="320" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="360" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="400" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="440" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="480" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="520" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="560" cy="30" r="1.5" fill="rgba(83,74,183,0.15)"/>
          <circle cx="40" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="80" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="120" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="160" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="200" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="240" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="280" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="320" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="360" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="400" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="440" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="480" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="520" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="560" cy="70" r="1.5" fill="rgba(83,74,183,0.15)"/>
          <circle cx="40" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="80" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="120" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="160" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="200" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="240" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="280" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="320" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="360" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="400" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="440" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="480" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="520" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="560" cy="110" r="1.5" fill="rgba(83,74,183,0.15)"/>
          <circle cx="40" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="80" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="120" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="160" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="200" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="240" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="280" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="320" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="360" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="400" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="440" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="480" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="520" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/><circle cx="560" cy="150" r="1.5" fill="rgba(83,74,183,0.15)"/>

          <!-- Timeline bar -->
          <line x1="80" y1="100" x2="520" y2="100" stroke="rgba(83,74,183,0.2)" stroke-width="2"/>

          <!-- 6 checkpoint nodes along timeline -->
          <!-- 1: Price lists -->
          <circle cx="115" cy="100" r="14" fill="rgba(83,74,183,0.06)" stroke="rgba(83,74,183,0.3)" stroke-width="1.5"/>
          <text x="115" y="103" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="13" fill="#534AB7" font-weight="700">£</text>
          <text x="115" y="130" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="7.5" fill="rgba(83,74,183,0.55)" font-weight="600" letter-spacing="0.3">PRICES</text>

          <!-- 2: Estimates -->
          <circle cx="190" cy="100" r="14" fill="rgba(83,74,183,0.06)" stroke="rgba(83,74,183,0.3)" stroke-width="1.5"/>
          <rect x="183" y="93" width="14" height="14" rx="2" fill="none" stroke="#534AB7" stroke-width="1.5"/>
          <line x1="186" y1="99" x2="193" y2="99" stroke="#534AB7" stroke-width="1.2"/>
          <line x1="186" y1="103" x2="191" y2="103" stroke="#534AB7" stroke-width="1.2"/>
          <text x="190" y="130" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="7.5" fill="rgba(83,74,183,0.55)" font-weight="600" letter-spacing="0.3">ESTIMATES</text>

          <!-- 3: Rx fees -->
          <circle cx="265" cy="100" r="14" fill="rgba(69,196,188,0.06)" stroke="rgba(69,196,188,0.3)" stroke-width="1.5"/>
          <text x="265" y="104" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="11" fill="#45C4BC" font-weight="700">Rx</text>
          <text x="265" y="130" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="7.5" fill="rgba(69,196,188,0.7)" font-weight="600" letter-spacing="0.3">RX FEES</text>

          <!-- 4: Ownership -->
          <circle cx="340" cy="100" r="14" fill="rgba(69,196,188,0.06)" stroke="rgba(69,196,188,0.3)" stroke-width="1.5"/>
          <circle cx="340" cy="96" r="4.5" fill="none" stroke="#45C4BC" stroke-width="1.3"/>
          <path d="M333 106 Q340 101 347 106" fill="none" stroke="#45C4BC" stroke-width="1.3" stroke-linecap="round"/>
          <text x="340" y="130" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="7.5" fill="rgba(69,196,188,0.7)" font-weight="600" letter-spacing="0.3">OWNERSHIP</text>

          <!-- 5: RCVS site -->
          <circle cx="415" cy="100" r="14" fill="rgba(83,74,183,0.06)" stroke="rgba(83,74,183,0.3)" stroke-width="1.5"/>
          <circle cx="415" cy="98" r="6" fill="none" stroke="#534AB7" stroke-width="1.3"/>
          <line x1="419" y1="103" x2="423" y2="107" stroke="#534AB7" stroke-width="1.3" stroke-linecap="round"/>
          <text x="415" y="130" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="7.5" fill="rgba(83,74,183,0.55)" font-weight="600" letter-spacing="0.3">RCVS SITE</text>

          <!-- 6: Levy -->
          <circle cx="490" cy="100" r="14" fill="rgba(15,110,86,0.06)" stroke="rgba(15,110,86,0.3)" stroke-width="1.5"/>
          <text x="490" y="104" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="10" fill="#0F6E56" font-weight="700">£</text>
          <text x="490" y="130" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="7.5" fill="rgba(15,110,86,0.55)" font-weight="600" letter-spacing="0.3">LEVY</text>

          <!-- Timeline endpoints with dates -->
          <text x="80" y="165" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="8" fill="rgba(83,74,183,0.4)" font-weight="500">MAR 2026</text>
          <circle cx="80" cy="100" r="4" fill="#534AB7"/>
          <text x="520" y="165" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="8" fill="rgba(15,110,86,0.5)" font-weight="500">DEC 2026</text>
          <circle cx="520" cy="100" r="4" fill="#0F6E56"/>

          <!-- Deadline marker -->
          <line x1="430" y1="80" x2="430" y2="100" stroke="rgba(83,74,183,0.3)" stroke-width="1" stroke-dasharray="3 2"/>
          <text x="430" y="74" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="7" fill="rgba(83,74,183,0.45)" font-weight="500">SEP 2026</text>

          <!-- Decorative arcs -->
          <path d="M 50 35 A 40 40 0 0 1 50 75" stroke="rgba(83,74,183,0.12)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <path d="M 555 130 A 35 35 0 0 0 555 165" stroke="rgba(69,196,188,0.15)" stroke-width="1.5" fill="none" stroke-linecap="round"/>

          <!-- Floating accent dots -->
          <circle cx="150" cy="45" r="3" fill="none" stroke="rgba(69,196,188,0.35)" stroke-width="1.2"/>
          <circle cx="310" cy="55" r="4" fill="none" stroke="rgba(83,74,183,0.2)" stroke-width="1.2"/>
          <circle cx="460" cy="50" r="3" fill="none" stroke="rgba(69,196,188,0.3)" stroke-width="1.2"/><circle cx="460" cy="50" r="1.2" fill="rgba(69,196,188,0.3)"/>
          <circle cx="210" cy="160" r="3.5" fill="none" stroke="rgba(83,74,183,0.2)" stroke-width="1.2"/>
          <circle cx="370" cy="165" r="3" fill="none" stroke="rgba(69,196,188,0.25)" stroke-width="1.2"/><circle cx="370" cy="165" r="1.2" fill="rgba(69,196,188,0.25)"/>
        </svg>`,

  cost: `<svg viewBox="0 0 600 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <!-- Dot grid background -->
          <circle cx="40" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="80" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="120" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="160" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="200" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="240" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="280" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="320" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="360" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="400" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="440" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="480" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="520" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="560" cy="30" r="1.5" fill="rgba(83,74,183,0.12)"/>
          <circle cx="40" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="80" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="120" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="160" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="200" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="240" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="280" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="320" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="360" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="400" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="440" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="480" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="520" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="560" cy="70" r="1.5" fill="rgba(83,74,183,0.12)"/>
          <circle cx="40" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="80" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="120" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="160" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="200" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="240" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="280" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="320" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="360" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="400" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="440" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="480" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="520" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="560" cy="110" r="1.5" fill="rgba(83,74,183,0.12)"/>
          <circle cx="40" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="80" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="120" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="160" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="200" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="240" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="280" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="320" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="360" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="400" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="440" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="480" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="520" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/><circle cx="560" cy="150" r="1.5" fill="rgba(83,74,183,0.12)"/>

          <!-- Left: stacked cost bar -->
          <rect x="80" y="42" width="50" height="60" rx="3" fill="rgba(83,74,183,0.12)" stroke="rgba(83,74,183,0.3)" stroke-width="1.5"/>
          <rect x="80" y="102" width="50" height="18" rx="0" fill="rgba(69,196,188,0.12)" stroke="rgba(69,196,188,0.3)" stroke-width="1"/>
          <rect x="80" y="120" width="50" height="12" rx="0" fill="rgba(69,196,188,0.08)" stroke="rgba(69,196,188,0.2)" stroke-width="1"/>
          <rect x="80" y="132" width="50" height="10" rx="0" fill="rgba(15,110,86,0.1)" stroke="rgba(15,110,86,0.25)" stroke-width="1"/>
          <rect x="80" y="142" width="50" height="14" rx="0 0 3 3" fill="rgba(15,110,86,0.07)" stroke="rgba(15,110,86,0.2)" stroke-width="1"/>

          <!-- Bar labels -->
          <text x="105" y="76" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="8" fill="rgba(83,74,183,0.6)" font-weight="600">SALARY</text>
          <text x="105" y="114" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="6.5" fill="rgba(69,196,188,0.8)" font-weight="500">NI + PENSION</text>
          <text x="105" y="129" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="6" fill="rgba(69,196,188,0.7)" font-weight="500">COVER</text>
          <text x="105" y="140" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="5.5" fill="rgba(15,110,86,0.6)" font-weight="500">TRAINING</text>
          <text x="105" y="152" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="5" fill="rgba(15,110,86,0.5)" font-weight="500">EQUIP</text>

          <!-- Bracket showing total -->
          <path d="M140 42 L148 42 L148 156 L140 156" fill="none" stroke="rgba(83,74,183,0.3)" stroke-width="1.2"/>
          <line x1="148" y1="100" x2="155" y2="100" stroke="rgba(83,74,183,0.3)" stroke-width="1.2"/>
          <text x="160" y="97" font-family="DM Sans, sans-serif" font-size="8" fill="rgba(83,74,183,0.5)" font-weight="600">TRUE</text>
          <text x="160" y="107" font-family="DM Sans, sans-serif" font-size="8" fill="rgba(83,74,183,0.5)" font-weight="600">COST</text>

          <!-- Centre: multiplier visual -->
          <text x="300" y="75" text-anchor="middle" font-family="Outfit, sans-serif" font-size="36" fill="rgba(83,74,183,0.15)" font-weight="700">154%</text>
          <text x="300" y="95" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="10" fill="rgba(83,74,183,0.4)" font-weight="500">of salary</text>

          <!-- Rising cost arrow -->
          <path d="M260 120 L300 108 L340 120" fill="none" stroke="rgba(69,196,188,0.3)" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="300" cy="108" r="3" fill="#45C4BC" opacity="0.5"/>

          <!-- Right: comparison circles -->
          <!-- Salary circle (smaller) -->
          <circle cx="440" cy="90" r="24" fill="rgba(83,74,183,0.06)" stroke="rgba(83,74,183,0.25)" stroke-width="1.5"/>
          <text x="440" y="87" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="9" fill="rgba(83,74,183,0.6)" font-weight="700">£25k</text>
          <text x="440" y="98" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="6.5" fill="rgba(83,74,183,0.4)" font-weight="500">SALARY</text>

          <!-- True cost circle (larger, overlapping) -->
          <circle cx="510" cy="95" r="34" fill="rgba(15,110,86,0.05)" stroke="rgba(15,110,86,0.25)" stroke-width="1.5"/>
          <text x="510" y="91" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="11" fill="rgba(15,110,86,0.7)" font-weight="700">£38.5k</text>
          <text x="510" y="104" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="7" fill="rgba(15,110,86,0.45)" font-weight="500">TRUE COST</text>

          <!-- Connecting dashed arrow -->
          <line x1="465" y1="90" x2="476" y2="93" stroke="rgba(83,74,183,0.2)" stroke-width="1" stroke-dasharray="3 2"/>

          <!-- Decorative arcs -->
          <path d="M 50 35 A 30 30 0 0 1 50 65" stroke="rgba(83,74,183,0.1)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <path d="M 555 140 A 30 30 0 0 0 555 170" stroke="rgba(69,196,188,0.12)" stroke-width="1.5" fill="none" stroke-linecap="round"/>

          <!-- Floating accent dots -->
          <circle cx="220" cy="45" r="3" fill="none" stroke="rgba(69,196,188,0.3)" stroke-width="1.2"/>
          <circle cx="380" cy="55" r="3.5" fill="none" stroke="rgba(83,74,183,0.2)" stroke-width="1.2"/><circle cx="380" cy="55" r="1.3" fill="rgba(83,74,183,0.2)"/>
          <circle cx="250" cy="155" r="3" fill="none" stroke="rgba(69,196,188,0.25)" stroke-width="1.2"/><circle cx="250" cy="155" r="1.2" fill="rgba(69,196,188,0.25)"/>
          <circle cx="420" cy="155" r="2.5" fill="none" stroke="rgba(83,74,183,0.18)" stroke-width="1.2"/>
        </svg>`,
};

function getIllustration(key) {
  return ILLUSTRATIONS[key] || ILLUSTRATIONS.default;
}

function postPage({ slug, title, date, description, illustration, illustrationPosition, sectorTag, topicTag, html }, { nav, footer, headExtras }) {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
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
:root {
  --b-purple:     #534AB7;
  --b-purple-bg:  #2C2870;
  --b-signal:     #45C4BC;
  --b-near-black: #0F1923;
  --b-off-white:  #DCE0EC;
  --b-light-bg:   #F0F1F8;
  --b-body-color: #4A5A70;
  --b-border:     rgba(83,74,183,0.1);
  --f-display:    'Outfit', sans-serif;
  --f-body:       'DM Sans', sans-serif;
}

/* ── Hero banner ── */
.post-hero {
  padding-top: 82px;
  background: var(--b-near-black);
  position: relative;
  overflow: hidden;
}
.post-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 70% 50%, rgba(83,74,183,0.35) 0%, transparent 65%),
    radial-gradient(ellipse 50% 80% at 10% 80%, rgba(69,196,188,0.12) 0%, transparent 60%);
  pointer-events: none;
}
/* SVG grid pattern */
.post-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'%3E%3Cpath d='M60 0L0 0 0 60'/%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
}
.post-hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 56px 40px 60px;
  position: relative;
  z-index: 1;
}
.post-hero-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.post-hero-tag {
  font-family: var(--f-display);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 5px 14px;
  border-radius: 100px;
}
.post-hero-tag.sector {
  color: var(--b-near-black);
  background: var(--b-signal);
}
.post-hero-tag.topic {
  color: #fff;
  background: rgba(255,255,255,0.15);
}
.post-hero-date {
  font-family: var(--f-display);
  font-size: 11px;
  font-weight: 400;
  color: rgba(220,224,236,0.45);
  letter-spacing: 0.04em;
}
.post-hero h1 {
  font-family: var(--f-display);
  font-size: clamp(28px, 4.5vw, 52px);
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1.1;
  color: #FFFFFF;
  margin-bottom: 20px;
  max-width: 800px;
}
.post-hero-desc {
  font-family: var(--f-body);
  font-size: 17px;
  font-weight: 300;
  color: rgba(220,224,236,0.6);
  line-height: 1.7;
  max-width: 640px;
  margin-bottom: 32px;
}
.post-hero-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--f-body);
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  padding-top: 28px;
  border-top: 1px solid rgba(255,255,255,0.07);
}
.post-hero-breadcrumb a {
  color: rgba(220,224,236,0.45);
  text-decoration: none;
  transition: color 0.15s;
}
.post-hero-breadcrumb a:hover { color: var(--b-signal); }
.post-hero-breadcrumb span { opacity: 0.3; }

/* ── Page body ── */
.blog-post-wrap {
  background: #FAFAFA;
}
.post-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 64px 40px 100px;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 80px;
  align-items: start;
}

/* Decorative illustration */
.post-illustration {
  margin-bottom: 48px;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(83,74,183,0.05) 0%, rgba(69,196,188,0.05) 100%);
  border: 1px solid var(--b-border);
  padding: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.post-illustration svg { width: 100%; max-width: 600px; height: auto; }

/* Body copy */
.post-body p {
  font-family: var(--f-body);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.8;
  color: var(--b-body-color);
  margin-bottom: 22px;
}

/* H2 with teal accent bar */
.post-body h2 {
  font-family: var(--f-display);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.2px;
  line-height: 1.25;
  color: var(--b-near-black);
  margin: 48px 0 16px;
  padding-top: 8px;
  position: relative;
}
.post-body h2::before {
  content: '';
  display: block;
  width: 32px;
  height: 3px;
  background: var(--b-signal);
  border-radius: 2px;
  margin-bottom: 12px;
}

/* H3 with purple left accent */
.post-body h3 {
  font-family: var(--f-body);
  font-size: 15px;
  font-weight: 600;
  color: var(--b-purple);
  margin: 32px 0 12px;
  padding-left: 14px;
  border-left: 3px solid rgba(83,74,183,0.2);
}

.post-body strong { color: var(--b-near-black); font-weight: 600; }
.post-body a { color: var(--b-purple); text-decoration: underline; text-underline-offset: 3px; }
.post-body a:hover { color: var(--b-purple-bg); }

/* Unordered lists with teal dot markers */
.post-body ul {
  padding: 0;
  margin: 4px 0 24px 0;
  list-style: none;
}
.post-body ul li {
  font-family: var(--f-body);
  font-size: 17px;
  line-height: 1.8;
  color: var(--b-body-color);
  padding: 10px 0 10px 28px;
  position: relative;
  border-bottom: 1px solid rgba(83,74,183,0.05);
}
.post-body ul li:last-child { border-bottom: none; }
.post-body ul li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 19px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--b-signal);
}

/* Ordered lists with purple numbered circles */
.post-body ol {
  padding: 0;
  margin: 4px 0 24px 0;
  list-style: none;
  counter-reset: post-counter;
}
.post-body ol li {
  font-family: var(--f-body);
  font-size: 17px;
  line-height: 1.8;
  color: var(--b-body-color);
  padding: 10px 0 10px 44px;
  position: relative;
  border-bottom: 1px solid rgba(83,74,183,0.05);
  counter-increment: post-counter;
}
.post-body ol li:last-child { border-bottom: none; }
.post-body ol li::before {
  content: counter(post-counter);
  position: absolute;
  left: 0;
  top: 10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--b-purple);
  color: white;
  font-family: var(--f-display);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.post-body hr {
  border: none;
  border-top: 1px solid var(--b-border);
  margin: 48px 0;
}

/* Pull quote — coloured box */
.post-body blockquote {
  border-left: 4px solid var(--b-purple);
  background: linear-gradient(135deg, rgba(83,74,183,0.06) 0%, rgba(69,196,188,0.04) 100%);
  border-radius: 0 12px 12px 0;
  padding: 24px 28px;
  margin: 36px 0;
}
.post-body blockquote p {
  font-family: var(--f-display);
  font-size: 19px;
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
.post-body pre code { background: none; color: var(--b-off-white); font-size: 14px; padding: 0; }

/* Sidebar */
.sidebar-card {
  background: #FFFFFF;
  border: 1px solid var(--b-border);
  border-radius: 12px;
  overflow: hidden;
  position: sticky;
  top: 100px;
  box-shadow: 0 2px 12px rgba(83,74,183,0.07);
}
.sidebar-card-top {
  background: var(--b-purple-bg);
  padding: 24px 24px 20px;
  position: relative;
  overflow: hidden;
}
.sidebar-card-top::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 120% 100% at 80% 50%, rgba(69,196,188,0.2) 0%, transparent 65%);
}
.sidebar-card-top h3 {
  font-family: var(--f-display);
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
  line-height: 1.3;
}
.sidebar-card-top p {
  font-family: var(--f-body);
  font-size: 13px;
  font-weight: 300;
  color: rgba(220,224,236,0.65);
  line-height: 1.65;
  position: relative;
  z-index: 1;
}
.sidebar-card-body {
  padding: 20px 24px 24px;
}
.sidebar-card-body .btn {
  width: 100%;
  justify-content: center;
  font-size: 14px;
  display: flex;
}

/* Related / author strip */
.post-footer-strip {
  background: var(--b-near-black);
  padding: 56px 40px;
  margin-top: 0;
}
.post-footer-strip-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  flex-wrap: wrap;
}
.post-author {
  display: flex;
  align-items: center;
  gap: 16px;
}
.post-author-avatar {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--b-purple) 0%, var(--b-signal) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--f-display);
  font-size: 18px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}
.post-author-name {
  font-family: var(--f-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--b-off-white);
  display: block;
  margin-bottom: 3px;
}
.post-author-role {
  font-family: var(--f-body);
  font-size: 12px;
  font-weight: 300;
  color: rgba(220,224,236,0.4);
}
.post-footer-cta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.post-footer-cta p {
  font-family: var(--f-body);
  font-size: 14px;
  font-weight: 300;
  color: rgba(220,224,236,0.5);
  max-width: 280px;
  line-height: 1.55;
}

@media (max-width: 900px) {
  .post-hero-inner { padding: 40px 24px 48px; }
  .post-container { grid-template-columns: 1fr; gap: 40px; padding: 40px 24px 60px; }
  .sidebar-card { position: static; }
  .post-footer-strip { padding: 40px 24px; }
  .post-footer-strip-inner { flex-direction: column; align-items: flex-start; gap: 24px; }
}
</style>
</head>
<body>

${nav}

<!-- Dark hero banner with brand gradients -->
<div class="post-hero">
  <div class="post-hero-inner">
    <div class="post-hero-meta">
      <span class="post-hero-tag sector">${escHtml(sectorTag)}</span>
      <span class="post-hero-tag topic">${escHtml(topicTag)}</span>
      ${date ? `<span class="post-hero-date">${formatDate(date)}</span>` : ""}
    </div>
    <h1>${escHtml(title)}</h1>
    ${description ? `<p class="post-hero-desc">${escHtml(description)}</p>` : ""}
    <div class="post-hero-breadcrumb">
      <a href="/index.html">Home</a>
      <span>›</span>
      <a href="/blog/index.html">Blog</a>
      <span>›</span>
      <span>${escHtml(title)}</span>
    </div>
  </div>
</div>

<div class="blog-post-wrap">
  <div class="post-container">
    <main class="post-main">
      ${illustrationPosition === "top" ? `<div class="post-illustration">
        ${getIllustration(illustration)}
      </div>` : ""}
      <div class="post-body">
        ${illustrationPosition === "inline" ? html.replace("<!--illustration-->", `</div><div class="post-illustration">${getIllustration(illustration)}</div><div class="post-body">`) : html}
      </div>
      ${illustrationPosition === "bottom" ? `<div class="post-illustration">
        ${getIllustration(illustration)}
      </div>` : ""}
    </main>

    <aside class="post-sidebar">
      <div class="sidebar-card">
        <div class="sidebar-card-top">
          <h3>Interested in AI for your practice?</h3>
          <p>Book a free 30-minute consultation. No pitch. No pressure.</p>
        </div>
        <div class="sidebar-card-body">
          <a href="/consultation.html" class="btn btn-primary">Book a free consultation &rarr;</a>
        </div>
      </div>
    </aside>
  </div>
</div>

<!-- Author / CTA footer strip -->
<div class="post-footer-strip">
  <div class="post-footer-strip-inner">
    <div class="post-author">
      <div class="post-author-avatar">C</div>
      <div>
        <span class="post-author-name">Clinevo Team</span>
        <span class="post-author-role">Clinevo · Clinical AI Consultancy</span>
      </div>
    </div>
    <div class="post-footer-cta">
      <p>Clinevo helps veterinary, optical, and dental practices implement AI that actually works.</p>
      <a href="/consultation.html" class="btn btn-teal">Free consultation &rarr;</a>
    </div>
  </div>
</div>

${footer}

</body>
</html>`;
}

function blogIndexPage(posts, { nav, footer, headExtras }) {
  const postCards = posts.length
    ? posts.map(({ slug, title, date, description, sectorTag, topicTag }) => `
      <article class="blog-card">
        <div class="blog-card-banner" aria-hidden="true">
          ${date ? `<span class="blog-card-banner-date">${formatDate(date)}</span>` : ""}
        </div>
        <a href="/blog/posts/${slug}.html" class="blog-card-body">
          <span class="blog-card-tags">
            <span class="blog-card-tag sector">${escHtml(sectorTag)}</span>
            <span class="blog-card-tag topic">${escHtml(topicTag)}</span>
          </span>
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
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
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
/* ── Blog index ── */
.blog-hero {
  padding-top: 82px;
  background: #0F1923;
  position: relative;
  overflow: hidden;
}
.blog-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 100% at 90% 50%, rgba(83,74,183,0.3) 0%, transparent 65%),
    radial-gradient(ellipse 40% 80% at 5% 80%, rgba(69,196,188,0.1) 0%, transparent 60%);
}
.blog-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'%3E%3Cpath d='M60 0L0 0 0 60'/%3E%3C/g%3E%3C/svg%3E");
}
.blog-hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 56px 40px 60px;
  position: relative;
  z-index: 1;
}
.blog-hero-tag {
  display: inline-block;
  font-family: 'Outfit', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #0F1923;
  background: #45C4BC;
  padding: 5px 14px;
  border-radius: 100px;
  margin-bottom: 24px;
}
.blog-hero-inner h1 {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(28px, 4.5vw, 52px);
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1.1;
  color: #DCE0EC;
  margin-bottom: 16px;
}
.blog-hero-inner p {
  font-family: 'DM Sans', sans-serif;
  font-size: 16px;
  font-weight: 300;
  color: rgba(220,224,236,0.5);
  max-width: 52ch;
  line-height: 1.7;
}

/* Grid */
.blog-index-wrap {
  background: #F4F5FA;
  padding: 56px 40px 100px;
}
.blog-index-inner {
  max-width: 1200px;
  margin: 0 auto;
}
.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

/* Cards */
.blog-card {
  background: #FFFFFF;
  border: 1px solid rgba(83,74,183,0.1);
  border-radius: 14px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.25s ease, border-color 0.2s;
  box-shadow: 0 2px 8px rgba(83,74,183,0.06);
}
.blog-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(83,74,183,0.12);
  border-color: rgba(83,74,183,0.22);
}

/* Subtle brand-tinted banner top of each card */
.blog-card-banner {
  position: relative;
  height: 56px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(83,74,183,0.06) 0%, rgba(69,196,188,0.06) 100%);
  border-bottom: 1px solid rgba(83,74,183,0.08);
}
.blog-card-banner-date {
  position: absolute;
  bottom: 10px;
  left: 16px;
  font-family: 'Outfit', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #534AB7;
  z-index: 1;
}

.blog-card-body {
  display: block;
  padding: 20px 24px 24px;
  text-decoration: none;
}
.blog-card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.blog-card-tag {
  display: inline-block;
  font-family: 'Outfit', sans-serif;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 100px;
}
.blog-card-tag.sector {
  color: #0F6E56;
  background: rgba(69,196,188,0.12);
}
.blog-card-tag.topic {
  color: #534AB7;
  background: rgba(83,74,183,0.08);
}
.blog-card h2 {
  font-family: 'Outfit', sans-serif;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.2px;
  line-height: 1.3;
  color: #0F1923;
  margin-bottom: 10px;
}
.blog-card p {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 300;
  line-height: 1.7;
  color: #4A5A70;
  margin-bottom: 18px;
}
.blog-card-link {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #534AB7;
  letter-spacing: 0.01em;
}
.blog-empty {
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  color: #4A5A70;
  grid-column: 1 / -1;
}

@media (max-width: 900px) {
  .blog-hero-inner { padding: 40px 24px 48px; }
  .blog-index-wrap { padding: 40px 24px 60px; }
  .blog-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>

${nav}

<div class="blog-hero">
  <div class="blog-hero-inner">
    <span class="blog-hero-tag">Clinevo Blog</span>
    <h1>Clinical AI Insights</h1>
    <p>Practical articles for practice owners and managers. No hype. Just what actually works.</p>
  </div>
</div>

<div class="blog-index-wrap">
  <div class="blog-index-inner">
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
