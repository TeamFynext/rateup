import { Link } from "@tanstack/react-router";

import type { Author, Tag } from "@/lib/posts.ts";

export function BrowseSection({
  tags,
  authors,
}: {
  tags: Tag[];
  authors: Author[];
}) {
  return (
    <section style={{ marginTop: 28 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 18,
            color: "#0E1E3A",
            letterSpacing: "-0.01em",
          }}
        >
          Browse Posts
        </div>
        <a
          href="/blog/rss.xml"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F4F5F2",
            border: "1px solid #DCDEDD",
            color: "#8B8E8A",
            cursor: "pointer",
            transition: "color 0.17s, background 0.17s, border-color 0.17s",
            textDecoration: "none",
          }}
          title="RSS Feed"
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.color = "#FFB638";
            el.style.background = "rgba(248,149,29,0.06)";
            el.style.borderColor = "rgba(248,149,29,0.22)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.color = "#8B8E8A";
            el.style.background = "#F4F5F2";
            el.style.borderColor = "#DCDEDD";
          }}
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 9,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#9B9D9A",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Filter by tag:
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Link
              to="/blog"
              style={{
                padding: "5px 13px",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                color: "#1C518E",
                background: "#EEF4FB",
                border: "1px solid #A9C3E3",
                textDecoration: "none",
              }}
            >
              All
            </Link>
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/blog/tag/${encodeURIComponent(tag.slug)}`}
                style={{
                  padding: "5px 13px",
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#4A4C49",
                  background: "#fff",
                  border: "1px solid #DCDEDD",
                  textDecoration: "none",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "#F4F5F2";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "#fff";
                }}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Author row */}
      {authors && authors.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#9B9D9A",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Filter by author:
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Link
              to="/blog"
              style={{
                padding: "5px 13px",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                color: "#1C518E",
                background: "#EEF4FB",
                border: "1px solid #A9C3E3",
                textDecoration: "none",
              }}
            >
              All
            </Link>
            {authors.map((author) => (
              <Link
                key={author.id}
                to={`/blog/author/${encodeURIComponent(author.slug)}`}
                style={{
                  padding: "5px 13px",
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#4A4C49",
                  background: "#fff",
                  border: "1px solid #DCDEDD",
                  textDecoration: "none",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "#F4F5F2";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "#fff";
                }}
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
