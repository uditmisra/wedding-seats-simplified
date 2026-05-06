import { Link } from "react-router-dom";
import type { BlogPost } from "@/lib/blog/types";

export function PostCard({ post }: { post: BlogPost }) {
  const displayDate = new Date(post.publishDate).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <article>
      <Link
        to={`/blog/${post.slug}`}
        className="group block rounded-2xl border hairline bg-white/40 p-6 transition hover:bg-white/70 hover:shadow-soft"
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-terracotta">
            {post.category}
          </span>
          <span className="text-ink-4">·</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4">
            {post.readTime} min read
          </span>
        </div>

        <h2 className="m-0 mb-3 font-display text-[22px] leading-[1.15] group-hover:text-terracotta transition-colors">
          {post.title}
        </h2>

        <p className="m-0 mb-5 text-[14px] leading-[1.6] text-ink-3 line-clamp-3">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-between">
          <time
            dateTime={post.publishDate}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4"
          >
            {displayDate}
          </time>
          <span className="font-mono text-[11px] text-ink-3 opacity-0 transition group-hover:opacity-100">
            Read →
          </span>
        </div>
      </Link>
    </article>
  );
}
