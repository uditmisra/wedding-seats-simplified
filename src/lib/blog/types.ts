export interface FaqItem {
  q: string;
  a: string;
}

export interface BlogPost {
  slug: string;

  // SEO head
  title: string;          // used as H1 on the post page
  metaTitle: string;      // <title> tag — can be slightly different, max ~60 chars
  metaDescription: string; // <meta description> — 150–160 chars

  // Dates (ISO 8601)
  publishDate: string;
  updatedDate?: string;

  // Listing metadata
  category: string;
  tags?: string[];
  readTime: number; // estimated minutes
  excerpt: string;  // 2–3 sentences shown on the index card

  // Content — Markdown string
  content: string;

  // Optional FAQ array: renders a styled FAQ section + injects FAQPage schema
  faq?: FaqItem[];

  // Optional OG image path (relative to /public)
  heroImage?: string;
}
