import type { BlogPost } from "./types";
import posts from "./posts/index";

export function getAllPosts(): BlogPost[] {
  return posts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find(p => p.slug === slug);
}

export function getPostsByCategory(category: string): BlogPost[] {
  return posts.filter(p => p.category === category);
}

export function getAllCategories(): string[] {
  return [...new Set(posts.map(p => p.category))];
}
