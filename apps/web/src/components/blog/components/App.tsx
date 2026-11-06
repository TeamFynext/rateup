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

      <div className="max-w-[1300px] mx-auto px-[28px]">
        <div className="grid grid-cols-[1fr_268px] gap-[28px] max-[1040px]:gap-[22px] max-[820px]:grid-cols-1 items-start pt-9 pb-20">
          {/* Main content */}
          <main className="flex flex-col gap-[28px]">
            {isSearching ? (
              <>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display font-extrabold text-[18px] text-[#0E1E3A] tracking-[-0.01em] m-0">
                    Search Results ({filteredPosts.length})
                  </h3>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-[13px] font-semibold text-primary bg-transparent border-none cursor-pointer p-0"
                  >
                    Clear search
                  </button>
                </div>

                {filteredPosts.length > 0 ? (
                  <ArticlesGrid posts={filteredPosts} />
                ) : (
                  <div className="py-[60px] px-5 text-center bg-white rounded-[20px] border border-border text-[#64666A]">
                    <p className="text-[15.5px] font-semibold m-0 mb-3">
                      No articles found matching "{searchQuery}"
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="bg-accent border border-ru-blue-200 text-primary py-2 px-[18px] rounded-[9px] cursor-pointer font-bold text-[13px] transition-colors duration-200 hover:bg-ru-blue-100"
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
                {remainingPosts.length > 0 && <ArticlesGrid posts={remainingPosts} />}
              </>
            )}
          </main>

          {/* Sidebar */}
          <aside className="sticky top-[88px] max-[820px]:static flex flex-col gap-4">
            {/* <div className="hidden lg:block w-[268px] shrink-0"> */}
            <div className="sticky top-26 h-fit">
              <StickySidebar />
            </div>
            {/* </div> */}
          </aside>
        </div>
      </div>
    </>
  );
}
