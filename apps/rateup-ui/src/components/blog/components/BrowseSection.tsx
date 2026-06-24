import { Link } from "@tanstack/react-router";

import type { Author, Tag } from "@/lib/posts.ts";

export function BrowseSection({ tags, authors }: { tags: Tag[]; authors: Author[] }) {
  return (
    <section className="mt-7">
      <div className="flex items-center justify-between mb-4">
        <div className="font-nunito font-extrabold text-[18px] text-[#0E1E3A] tracking-[-0.01em]">
          Browse Posts
        </div>
        <a
          href="/blog/rss.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 rounded-[9px] flex items-center justify-center bg-[#F4F5F2] hover:bg-[#F8951D]/[0.06] border border-[#DCDEDD] hover:border-[#F8951D]/[0.22] text-[#8B8E8A] hover:text-[#FFB638] cursor-pointer transition-all duration-200 no-underline"
          title="RSS Feed"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
            <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none" />
          </svg>
        </a>
      </div>

      {/* Tag row */}
      {tags && tags.length > 0 && (
        <div className="flex items-center gap-[10px] flex-wrap mb-[9px]">
          <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#9B9D9A] whitespace-nowrap shrink-0">
            Filter by tag:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Link
              to="/blog"
              className="py-[5px] px-[13px] rounded-full text-[13px] font-semibold text-[#1C518E] bg-[#EEF4FB] border border-[#A9C3E3] no-underline"
            >
              All
            </Link>
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/blog/tag/${encodeURIComponent(tag.slug)}`}
                className="py-[5px] px-[13px] rounded-full text-[13px] font-semibold text-[#4A4C49] bg-white hover:bg-[#F4F5F2] border border-[#DCDEDD] no-underline transition-all duration-150"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Author row */}
      {authors && authors.length > 0 && (
        <div className="flex items-center gap-[10px] flex-wrap mt-1">
          <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#9B9D9A] whitespace-nowrap shrink-0">
            Filter by author:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Link
              to="/blog"
              className="py-[5px] px-[13px] rounded-full text-[13px] font-semibold text-[#1C518E] bg-[#EEF4FB] border border-[#A9C3E3] no-underline"
            >
              All
            </Link>
            {authors.map((author) => (
              <Link
                key={author.id}
                to={`/blog/author/${encodeURIComponent(author.slug)}`}
                className="py-[5px] px-[13px] rounded-full text-[13px] font-semibold text-[#4A4C49] bg-white hover:bg-[#F4F5F2] border border-[#DCDEDD] no-underline transition-all duration-150"
              >
                {author.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
