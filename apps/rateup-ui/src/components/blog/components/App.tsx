import { useState } from "react";

import type { Author, Post, Tag } from "@/lib/posts.ts";

import StickySidebar from "../StickySidebar";
import { ArticlesGrid } from "./ArticlesGrid";
import { BlogHero } from "./BlogHero";
import { BrowseSection } from "./BrowseSection";
import { FeaturedPost } from "./FeaturedPost";

interface AppProps {
  posts: Post[];
  authors: Author[];
  tags: Tag[];
}

export default function App({ posts, authors, tags }: AppProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const query = searchQuery.trim().toLowerCase();
  const filteredPosts =
    posts?.filter((post) => {
      if (!query) return true;
      return (
        post.title?.toLowerCase().includes(query) ||
        post.custom_excerpt?.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query) ||
        post.primary_author?.name?.toLowerCase().includes(query) ||
        post.primary_tag?.name?.toLowerCase().includes(query)
      );
    }) || [];

  const isSearching = query.length > 0;
  const featuredPost = !isSearching ? filteredPosts[0] : null;
  const remainingPosts = !isSearching ? filteredPosts.slice(1) : filteredPosts;

  return (
    <>
      <BlogHero searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 268px",
            gap: 28,
            alignItems: "start",
            padding: "36px 0 80px",
          }}
          className="blog-layout"
        >
          {/* Main content */}
          <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {isSearching ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
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
                    Search Results ({filteredPosts.length})
                  </h3>
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#1C518E",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Clear search
                  </button>
                </div>

                {filteredPosts.length > 0 ? (
                  <ArticlesGrid posts={filteredPosts} />
                ) : (
                  <div
                    style={{
                      padding: "60px 20px",
                      textAlign: "center",
                      background: "#fff",
                      borderRadius: 20,
                      border: "1px solid #ECECEA",
                      color: "#64666A",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 15.5,
                        fontWeight: 600,
                        margin: "0 0 12px 0",
                      }}
                    >
                      No articles found matching "{searchQuery}"
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      style={{
                        background: "#EEF4FB",
                        border: "1px solid #A9C3E3",
                        color: "#1C518E",
                        padding: "8px 18px",
                        borderRadius: 9,
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 13,
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#D6E4F3";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#EEF4FB";
                      }}
                    >
                      Clear search
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {featuredPost && <FeaturedPost post={featuredPost} />}
                <BrowseSection tags={tags} authors={authors} />
                {remainingPosts.length > 0 && (
                  <ArticlesGrid posts={remainingPosts} />
                )}
              </>
            )}
          </main>

          {/* Sidebar */}
          <aside
            style={{
              position: "sticky",
              top: 88,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            className="blog-sidebar"
          >
            {/* <div className="hidden lg:block w-[268px] shrink-0"> */}
            <div className="sticky top-26 h-fit">
              <StickySidebar />
            </div>
            {/* </div> */}
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 1040px) {
          .blog-layout { grid-template-columns: 1fr 268px !important; gap: 22px !important; }
        }
        @media (max-width: 820px) {
          .blog-layout { grid-template-columns: 1fr !important; }
          .blog-sidebar { position: static !important; }
        }
      `}</style>
    </>
  );
}
