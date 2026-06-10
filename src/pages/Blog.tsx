import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { PostCard } from "@/components/blog/PostCard";
import { JsonLd } from "@/components/JsonLd";
import { useSeoHead } from "@/lib/useSeoHead";
import { getAllPosts, getAllCategories } from "@/lib/blog/registry";
import { SITE_URL } from "@/lib/siteUrl";
import { useState } from "react";

export default function Blog() {
  const allPosts = getAllPosts();
  const categories = getAllCategories();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? allPosts.filter(p => p.category === activeCategory)
    : allPosts;

  useSeoHead({
    title: "Seating Chart Tips & Wedding Advice | Wedding Seater",
    description: "Free guides on wedding seating charts, seating arrangement tips, and planning advice from the team behind Wedding Seater.",
    canonical: `${SITE_URL}/blog.html`,
    ogType: "website",
  });

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Wedding Seater Blog",
    "description": "Wedding planning tips, seating chart advice, and free guides for couples.",
    "url": `${SITE_URL}/blog.html`,
    "publisher": {
      "@type": "Organization",
      "name": "Wedding Seater",
      "url": SITE_URL,
    },
    "blogPost": allPosts.map(p => ({
      "@type": "BlogPosting",
      "headline": p.title,
      "description": p.excerpt,
      "url": `${SITE_URL}/blog/${p.slug}.html`,
      "datePublished": p.publishDate,
      ...(p.updatedDate ? { "dateModified": p.updatedDate } : {}),
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${SITE_URL}/blog.html` },
    ],
  };

  return (
    <div className="paper-grain min-h-screen">
      <JsonLd id="blog-index" schema={blogSchema} />
      <JsonLd id="blog-breadcrumb" schema={breadcrumbSchema} />

      <header className="container flex items-center justify-between py-7">
        <Logo size={22} />
        <nav className="hidden items-center gap-6 text-sm text-ink-2 md:flex" aria-label="Main navigation">
          <Link to="/" className="hover:text-ink">Home</Link>
          <Link to="/blog" className="text-ink font-medium">Blog</Link>
          <UserMenu />
        </nav>
        <div className="md:hidden"><UserMenu /></div>
      </header>

      <main className="container pb-24">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-10">
          <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4">
            <li><Link to="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li className="text-ink-2">Blog</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-14 border-b hairline pb-10">
          <h1 className="m-0 mb-4 font-display text-[52px] leading-[1.0] tracking-[-0.02em]">
            Wedding planning <span className="font-display-italic">guides.</span>
          </h1>
          <p className="m-0 max-w-[520px] text-[17px] leading-[1.6] text-ink-2">
            Free, practical guides on wedding seating charts, table arrangements, and everything that makes the planning less painful.
          </p>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="mb-10 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition ${
                !activeCategory
                  ? "border-ink bg-ink text-paper"
                  : "hairline text-ink-3 hover:text-ink"
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition ${
                  activeCategory === cat
                    ? "border-ink bg-ink text-paper"
                    : "hairline text-ink-3 hover:text-ink"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Post grid */}
        {filtered.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(post => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <p className="font-display-italic text-[20px] text-ink-3">
              Posts coming soon.
            </p>
            <p className="mt-3 text-[14px] text-ink-4">
              We're working on guides for seating chart planning, family drama management, and more.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
