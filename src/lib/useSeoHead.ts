import { useEffect } from "react";

interface SeoHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  publishDate?: string;
  updatedDate?: string;
  noindex?: boolean;
}

function setMeta(selector: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    const [attr, val] = selector.replace("meta[", "").replace("]", "").split("=");
    el.setAttribute(attr, val.replace(/['"]/g, ""));
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

export function useSeoHead({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = "website",
  publishDate,
  updatedDate,
  noindex = false,
}: SeoHeadProps) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', ogTitle ?? title);
    setMeta('meta[property="og:description"]', ogDescription ?? description);
    setMeta('meta[property="og:type"]', ogType);
    // og:url should mirror the canonical (or fall back to the live URL) so
    // subpages don't all advertise the homepage as their social preview URL.
    const ogUrl = canonical ?? (typeof window !== "undefined" ? window.location.href : undefined);
    if (ogUrl) setMeta('meta[property="og:url"]', ogUrl);
    setMeta('meta[name="twitter:title"]', ogTitle ?? title);
    setMeta('meta[name="twitter:description"]', ogDescription ?? description);
    if (ogImage) {
      setMeta('meta[property="og:image"]', ogImage);
      setMeta('meta[name="twitter:image"]', ogImage);
    }
    if (publishDate) setMeta('meta[property="article:published_time"]', publishDate);
    if (updatedDate) setMeta('meta[property="article:modified_time"]', updatedDate);
    if (canonical) setCanonical(canonical);
    setMeta('meta[name="robots"]', noindex ? "noindex,nofollow" : "index,follow");

    return () => {
      document.title = prevTitle;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, canonical, ogType, noindex]);
}
