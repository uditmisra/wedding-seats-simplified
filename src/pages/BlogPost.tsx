import { useParams, Link, Navigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { marked } from "marked";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { JsonLd } from "@/components/JsonLd";
import { useSeoHead } from "@/lib/useSeoHead";
import { getPostBySlug } from "@/lib/blog/registry";
import { SITE_URL } from "@/lib/siteUrl";
import { ChevronDown } from "lucide-react";

// Configure marked once
marked.setOptions({ gfm: true, breaks: false });

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const html = useMemo(
    () => (post ? (marked(post.content) as string) : ""),
    [post],
  );

  useSeoHead(
    post
      ? {
          title: post.metaTitle,
          description: post.metaDescription,
          canonical: `${SITE_URL}/blog/${post.slug}`,
          ogType: "article",
          publishDate: post.publishDate,
          updatedDate: post.updatedDate,
        }
      : {
          title: "Post not found | Wedding Seater Blog",
          description: "",
          noindex: true,
        },
  );

  if (!post) return <Navigate to="/blog" replace />;

  const displayDate = new Date(post.publishDate).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  const updatedDisplay = post.updatedDate
    ? new Date(post.updatedDate).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  // ── JSON-LD schemas ────────────────────────────────────────────────
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.metaDescription,
    "url": `${SITE_URL}/blog/${post.slug}`,
    "datePublished": post.publishDate,
    ...(post.updatedDate ? { "dateModified": post.updatedDate } : {}),
    "author": { "@type": "Organization", "name": "Wedding Seater", "url": SITE_URL },
    "publisher": {
      "@type": "Organization",
      "name": "Wedding Seater",
      "url": SITE_URL,
      "logo": { "@type": "ImageObject", "url": `${SITE_URL}/og-image.png` },
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
    ...(post.heroImage ? { "image": `${SITE_URL}${post.heroImage}` } : {}),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${SITE_URL}/blog` },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": `${SITE_URL}/blog/${post.slug}` },
    ],
  };

  const faqSchema = post.faq?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": post.faq.map(item => ({
          "@type": "Question",
          "name": item.q,
          "acceptedAnswer": { "@type": "Answer", "text": item.a },
        })),
      }
    : null;

  return (
    <div className="paper-grain min-h-screen">
      <JsonLd id="post-article" schema={articleSchema} />
      <JsonLd id="post-breadcrumb" schema={breadcrumbSchema} />
      {faqSchema && <JsonLd id="post-faq" schema={faqSchema} />}

      <header className="container flex items-center justify-between py-7">
        <Logo size={22} />
        <nav className="hidden items-center gap-6 text-sm text-ink-2 md:flex" aria-label="Main navigation">
          <Link to="/" className="hover:text-ink">Home</Link>
          <Link to="/blog" className="hover:text-ink">Blog</Link>
          <UserMenu />
        </nav>
        <div className="md:hidden"><UserMenu /></div>
      </header>

      <main className="container pb-24">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-10">
          <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4">
            <li><Link to="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link to="/blog" className="hover:text-ink">Blog</Link></li>
            <li aria-hidden="true">›</li>
            <li className="text-ink-2 truncate max-w-[200px]">{post.title}</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-[720px]">
          {/* Post header */}
          <header className="mb-12 border-b hairline pb-10">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-terracotta">
                {post.category}
              </span>
              <span className="text-ink-4" aria-hidden="true">·</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4">
                {post.readTime} min read
              </span>
            </div>

            <h1 className="m-0 mb-6 font-display text-[40px] leading-[1.08] tracking-[-0.02em] md:text-[52px]">
              {post.title}
            </h1>

            <p className="m-0 mb-8 text-[18px] leading-[1.6] text-ink-2">
              {post.excerpt}
            </p>

            <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4">
              <time dateTime={post.publishDate}>Published {displayDate}</time>
              {updatedDisplay && (
                <span>Updated {updatedDisplay}</span>
              )}
            </div>
          </header>

          {/* Article body — prose */}
          <article
            className="prose prose-stone max-w-none
              prose-headings:font-display prose-headings:tracking-[-0.02em] prose-headings:text-ink
              prose-h2:text-[28px] prose-h2:leading-[1.15] prose-h2:mt-12 prose-h2:mb-4
              prose-h3:text-[20px] prose-h3:leading-[1.2] prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-[16px] prose-p:leading-[1.7] prose-p:text-ink-2
              prose-a:text-terracotta prose-a:no-underline hover:prose-a:underline
              prose-strong:text-ink prose-strong:font-semibold
              prose-ul:text-ink-2 prose-ol:text-ink-2
              prose-li:text-[16px] prose-li:leading-[1.7]
              prose-blockquote:border-l-terracotta prose-blockquote:text-ink-2 prose-blockquote:font-display-italic
              prose-code:text-terracotta prose-code:bg-paper-2 prose-code:rounded prose-code:px-1
              prose-hr:border-hairline
              prose-table:text-[14px]
              prose-th:font-mono prose-th:text-[10px] prose-th:uppercase prose-th:tracking-[0.12em] prose-th:text-ink-3
            "
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* FAQ section */}
          {post.faq && post.faq.length > 0 && (
            <section aria-labelledby="faq-heading" className="mt-16 border-t hairline pt-12">
              <h2 id="faq-heading" className="m-0 mb-8 font-display text-[28px] leading-[1.15]">
                Frequently asked questions
              </h2>
              <dl className="divide-y hairline">
                {post.faq.map((item, i) => (
                  <div key={i} className="py-4">
                    <dt>
                      <button
                        type="button"
                        aria-expanded={openFaq === i}
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="flex w-full items-center justify-between gap-4 text-left font-display text-[17px] leading-[1.3] hover:text-terracotta transition-colors"
                      >
                        {item.q}
                        <ChevronDown
                          size={15}
                          className={`shrink-0 text-ink-4 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                        />
                      </button>
                    </dt>
                    {openFaq === i && (
                      <dd className="mt-3 text-[15px] leading-[1.65] text-ink-2 ml-0">
                        {item.a}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Conversion block — readers arrived from a high-intent search;
              give them the product before the footer. */}
          <aside className="mt-16 rounded-2xl border border-ink bg-paper p-8 shadow-elegant paper-grain md:p-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-terracotta">
              Skip the spreadsheet
            </div>
            <h2 className="m-0 mt-3 font-display text-[28px] leading-[1.1] md:text-[32px]">
              Do this in an <em className="font-display-italic">afternoon</em>, not a month.
            </h2>
            <p className="mt-3 max-w-[480px] text-[15px] leading-[1.6] text-ink-2">
              Drag your guests onto your tables. Auto-seat handles the divorced
              parents and the cousins who don&apos;t speak. £10 once — no
              subscription.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/demo"
                className="rounded-full bg-ink px-6 py-2.5 text-[14px] font-medium text-paper transition hover:bg-ink-2"
              >
                Try the demo — free
              </Link>
              <Link
                to="/"
                className="rounded-full border hairline px-5 py-2.5 text-[13px] text-ink-2 transition hover:bg-paper-2 hover:text-ink"
              >
                See how it works
              </Link>
            </div>
          </aside>

          {/* Post footer */}
          <footer className="mt-16 border-t hairline pt-10">
            <div className="flex items-center justify-between">
              <Link
                to="/blog"
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3 hover:text-ink"
              >
                ← All posts
              </Link>
              <Link
                to="/"
                className="rounded-full border hairline px-5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2 hover:bg-paper-2 transition"
              >
                Start your seating chart →
              </Link>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
