import type { Post } from "@/lib/posts.ts";

import { ArticleCard } from "./ArticleCard";

export function ArticlesGrid({ posts }: { posts: Post[] }) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="mt-[30px]">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-[18px]">
        <h3 className="font-display font-extrabold text-[18px] text-[#0E1E3A] tracking-[-0.01em] m-0">
          Latest Articles
        </h3>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-3 max-[820px]:grid-cols-2 max-[540px]:grid-cols-1 gap-4">
        {posts.map((post, i) => (
          <ArticleCard
            key={post.id}
            post={post}
            index={i}
            delay={String(i % 3 === 1 ? 1 : i % 3 === 2 ? 2 : undefined)}
          />
        ))}
      </div>
    </section>
  );
}
