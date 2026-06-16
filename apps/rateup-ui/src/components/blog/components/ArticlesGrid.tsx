import type { Post } from "@/lib/posts.ts";

import { ArticleCard } from "./ArticleCard";

export function ArticlesGrid({ posts }: { posts: Post[] }) {
  if (!posts || posts.length === 0) return null;

  return (
    <section style={{ marginTop: 30 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <h3
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 18,
            color: "#0E1E3A",
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          Latest Articles
        </h3>
      </div>

      {/* 3-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
        className="articles-grid"
      >
        {posts.map((post, i) => (
          <ArticleCard
            key={post.id}
            post={post}
            index={i}
            delay={String(i % 3 === 1 ? 1 : i % 3 === 2 ? 2 : undefined)}
          />
        ))}
      </div>

      <style>{`
        @media (max-width: 820px) {
          .articles-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 540px) {
          .articles-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
