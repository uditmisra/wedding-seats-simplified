import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/siteUrl";
import { useSeoHead } from "@/lib/useSeoHead";

export function LegalPage({ kicker, title, children }: { kicker: string; title: ReactNode; children: ReactNode }) {
  const { pathname } = useLocation();
  useSeoHead({
    title: `${kicker} | Wedding Seater`,
    description: `${kicker} for Wedding Seater — the wedding seating chart planner.`,
    canonical: `${SITE_URL}${pathname}`,
  });
  return (
    <div className="min-h-screen bg-paper paper-grain">
      <JsonLd id={`legal-${pathname.replace(/\//g, "")}`} schema={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": kicker,
        "url": `${SITE_URL}${pathname}`,
        "isPartOf": {
          "@type": "WebSite",
          "name": "Wedding Seater",
          "url": SITE_URL,
        },
        "publisher": {
          "@type": "Organization",
          "name": "Wedding Seater",
          "url": SITE_URL,
        },
      }} />
      <header className="flex items-center justify-between border-b border-hairline px-6 py-5 lg:px-14">
        <Link to="/" aria-label="Home"><Logo /></Link>
        <Link to="/" className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3 hover:text-ink">← Back</Link>
      </header>
      <article className="mx-auto max-w-[720px] px-6 py-16 lg:px-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-terracotta">{kicker}</div>
        <h1 className="mt-3 font-display text-[48px] leading-[1] text-ink">{title}</h1>
        <div className="prose prose-ink mt-10 space-y-5 text-[15px] leading-[1.65] text-ink-2 [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:text-ink [&_h2]:mt-10 [&_h2]:mb-3 [&_strong]:text-ink [&_a]:text-terracotta [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
          {children}
        </div>
        <p className="mt-16 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">Last updated 7 May 2026</p>
      </article>
    </div>
  );
}
