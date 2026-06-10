/**
 * Build-time prerender for the blog.
 *
 * Problem: as a client-rendered SPA, every URL serves the same empty HTML
 * shell — Google discovers the 37 sitemap URLs, samples a couple, sees
 * indistinguishable shells, and reschedules the rest forever ("Discovered –
 * currently not indexed"). Rendering happens in a separate, budgeted queue
 * that young domains rarely win.
 *
 * Fix: after `vite build`, emit a real static HTML file per blog route —
 * unique <title>/meta/canonical/JSON-LD plus the full article text inside
 * #root. Crawlers index the static HTML in the first wave; the SPA bundle
 * still loads and takes over for humans (React's createRoot().render simply
 * replaces the static children).
 *
 * No headless browser: posts are markdown in the repo, so this renders them
 * with `marked` directly. Runs via `tsx` as part of `npm run build`.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import posts from "../src/lib/blog/posts/index";
import type { BlogPost } from "../src/lib/blog/types";

const SITE_URL = "https://weddingseater.app"; // mirror src/lib/siteUrl.ts
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");

marked.setOptions({ gfm: true, breaks: false });

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function headBlock(opts: {
  title: string; description: string; canonical: string;
  ogType?: string; publishDate?: string; updatedDate?: string;
}): string {
  const { title, description, canonical, ogType = "website", publishDate, updatedDate } = opts;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:site_name" content="Wedding Seater">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:image" content="${SITE_URL}/og/og-image.jpg">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${SITE_URL}/og/og-image.jpg">`,
    publishDate ? `<meta property="article:published_time" content="${publishDate}">` : "",
    updatedDate ? `<meta property="article:modified_time" content="${updatedDate}">` : "",
  ].filter(Boolean).join("\n    ");
}

/** Strip the base template's route-specific head tags so we can inject our own. */
function stripBaseHead(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>\n?/, "")
    .replace(/ *<meta name="(description|keywords)"[^>]*>\n?/g, "")
    .replace(/ *<link rel="canonical"[^>]*>\n?/g, "")
    .replace(/ *<meta (property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\n?/g, "");
}

function jsonLd(schema: object): string {
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function postSchemas(post: BlogPost): string {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    url,
    datePublished: post.publishDate,
    ...(post.updatedDate ? { dateModified: post.updatedDate } : {}),
    author: { "@type": "Organization", name: "Wedding Seater", url: SITE_URL },
    publisher: {
      "@type": "Organization", name: "Wedding Seater", url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/wedding-seater-mark.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };
  const faq = post.faq?.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faq.map(f => ({
      "@type": "Question", name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;
  return [jsonLd(article), jsonLd(breadcrumb), faq ? jsonLd(faq) : ""].filter(Boolean).join("\n    ");
}

/** Semantic article HTML for crawlers; the SPA replaces it on hydration. */
function postBody(post: BlogPost): string {
  const faqHtml = post.faq?.length
    ? `<section><h2>Frequently asked questions</h2><dl>${post.faq
        .map(f => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`)
        .join("")}</dl></section>`
    : "";
  return [
    `<header><nav><a href="/">Wedding Seater</a> · <a href="/blog">Blog</a></nav></header>`,
    `<main><article>`,
    `<p>${esc(post.category)} · ${post.readTime} min read</p>`,
    `<h1>${esc(post.title)}</h1>`,
    `<p><em>${esc(post.excerpt)}</em></p>`,
    marked(post.content) as string,
    faqHtml,
    `<footer><p><a href="/demo">Try the Wedding Seater demo</a> · <a href="/blog">All guides</a></p></footer>`,
    `</article></main>`,
  ].join("\n");
}

function renderPage(base: string, head: string, schemas: string, body: string): string {
  let html = stripBaseHead(base);
  html = html.replace("</head>", `    ${head}\n    ${schemas}\n  </head>`);
  html = html.replace(`<div id="root"></div>`, `<div id="root">${body}</div>`);
  return html;
}

function writeRoute(route: string, html: string): void {
  const dir = join(DIST, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
}

// ── Run ─────────────────────────────────────────────────────────────────────
const base = readFileSync(join(DIST, "index.html"), "utf8");
if (!base.includes(`<div id="root"></div>`)) {
  throw new Error("prerender: dist/index.html has no empty #root — template changed?");
}

for (const post of posts) {
  const head = headBlock({
    title: post.metaTitle,
    description: post.metaDescription,
    canonical: `${SITE_URL}/blog/${post.slug}`,
    ogType: "article",
    publishDate: post.publishDate,
    updatedDate: post.updatedDate,
  });
  writeRoute(`blog/${post.slug}`, renderPage(base, head, postSchemas(post), postBody(post)));
}

// Blog index — mirrors src/pages/Blog.tsx meta.
const indexHead = headBlock({
  title: "Seating Chart Tips & Wedding Advice | Wedding Seater",
  description: "Guides on wedding seating charts: table math, etiquette, divorced parents, escort cards, and tool comparisons — written for stressed couples.",
  canonical: `${SITE_URL}/blog`,
});
const indexBody = [
  `<header><nav><a href="/">Wedding Seater</a></nav></header>`,
  `<main><h1>Seating chart guides</h1><ul>`,
  ...posts.map(p => `<li><a href="/blog/${p.slug}">${esc(p.title)}</a> — ${esc(p.excerpt)}</li>`),
  `</ul></main>`,
].join("\n");
writeRoute("blog", renderPage(base, indexHead, "", indexBody));

console.log(`prerender: wrote ${posts.length} posts + blog index into dist/`);
