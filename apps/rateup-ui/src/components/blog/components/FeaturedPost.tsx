import { Link } from "@tanstack/react-router";

import type { Post } from "@/lib/posts.ts";

export function FeaturedPost({ post }: { post?: Post }) {
  if (!post) return null;

  const initials = post.primary_author?.name
    ? post.primary_author.name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "RU";

  const formattedDate = new Date(post.published_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  return (
    <article
      style={{
        borderRadius: 28,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #ECECEA",
        boxShadow:
          "0 1px 3px rgba(11,31,72,0.06), 0 8px 24px rgba(11,31,72,0.06)",
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        transition: "border-color 0.22s, box-shadow 0.22s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#C5D5EC";
        el.style.boxShadow = "0 16px 48px rgba(11,31,72,0.1)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#ECECEA";
        el.style.boxShadow =
          "0 1px 3px rgba(11,31,72,0.06), 0 8px 24px rgba(11,31,72,0.06)";
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          minHeight: 340,
          overflow: "hidden",
          background: "#06182F",
          borderRight: "1px solid #ECECEA",
        }}
      >
        {post.feature_image ? (
          <img
            src={post.feature_image}
            alt={post.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(145deg, #082040 0%, #0C2B54 45%, #071A33 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              padding: 22,
            }}
          >
            {/* Glow */}
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 180,
                height: 180,
                background:
                  "radial-gradient(circle, rgba(47,163,255,0.3), transparent 70%)",
                pointerEvents: "none",
              }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          padding: "32px 30px 30px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {post.primary_tag?.name && (
          <span
            style={{
              display: "inline-block",
              alignSelf: "flex-start",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              padding: "4px 11px",
              borderRadius: 9999,
              color: "#1C518E",
              background: "rgba(28,81,142,0.1)",
              border: "1px solid rgba(28,81,142,0.22)",
            }}
          >
            {post.primary_tag.name}
          </span>
        )}

        <h2
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            color: "#0E1E3A",
            fontSize: "clamp(21px, 2.2vw, 28px)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          {post.title}
        </h2>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.62,
            color: "#4A4C49",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 5,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {post.custom_excerpt || post.excerpt}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: "auto",
            paddingTop: 16,
            borderTop: "1px solid #ECECEA",
          }}
        >
          {post.primary_author?.profile_image ? (
            <img
              src={post.primary_author.profile_image}
              alt={post.primary_author.name}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                flexShrink: 0,
                background: "linear-gradient(135deg, #3D8BEE, #2360C8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 13,
                color: "#fff",
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, color: "#0E1E3A" }}>
              {post.primary_author?.name || "RateUp Team"}
            </div>
            <div style={{ fontSize: 11.5, color: "#8B8E8A" }}>
              {formattedDate}
            </div>
          </div>
          <Link
            to={`/blog/${post.slug}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 13.5,
              fontWeight: 700,
              color: "#1C518E",
              padding: "9px 18px",
              borderRadius: 9,
              background: "#EEF4FB",
              border: "1px solid #A9C3E3",
              textDecoration: "none",
              transition:
                "background 0.17s, border-color 0.17s, transform 0.17s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "#D6E4F3";
              el.style.borderColor = "#7BA1D1";
              el.style.color = "#0E2B52";
              el.style.transform = "translateX(2px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "#EEF4FB";
              el.style.borderColor = "#A9C3E3";
              el.style.color = "#1C518E";
              el.style.transform = "none";
            }}
          >
            Read more
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
