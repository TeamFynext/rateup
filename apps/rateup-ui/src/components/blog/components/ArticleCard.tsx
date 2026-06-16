import { useState } from "react";

import { Link } from "@tanstack/react-router";

import type { Post } from "@/lib/posts.ts";

import { WhatsAppIcon } from "./icons/WhatsAppIcon";

// Dynamic fallback style schemes for posts lacking a feature image
const fallbacks = [
  {
    gradient: "linear-gradient(145deg, #0C2B55 0%, #071A33 55%, #04101F 100%)",
    glow: "rgba(47,163,255,0.25)",
    badgeColor: "#4FC3FF",
    badgeBg: "rgba(47,163,255,0.12)",
    badgeBorder: "rgba(47,163,255,0.15)",
  },
  {
    gradient: "linear-gradient(145deg, #082818 0%, #03140C 55%, #010A06 100%)",
    glow: "rgba(74,222,128,0.2)",
    badgeColor: "#4ADE80",
    badgeBg: "rgba(74,222,128,0.1)",
    badgeBorder: "rgba(74,222,128,0.25)",
  },
  {
    gradient: "linear-gradient(145deg, #381E02 0%, #1D1001 55%, #0F0800 100%)",
    glow: "rgba(251,146,60,0.2)",
    badgeColor: "#FB923C",
    badgeBg: "rgba(251,146,60,0.1)",
    badgeBorder: "rgba(251,146,60,0.25)",
  },
];

export function ArticleCard({
  post,
  delay,
  index = 0,
}: {
  post: Post;
  delay?: string;
  index?: number;
}) {
  const [hovered, setHovered] = useState(false);

  const fallback = fallbacks[index % fallbacks.length];

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
    <Link
      to={`/blog/${post.slug}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <article
        className="reveal in"
        data-d={delay}
        style={{
          borderRadius: 20,
          overflow: "hidden",
          background: "#fff",
          border: `1px solid ${hovered ? "#C5D5EC" : "#ECECEA"}`,
          boxShadow: hovered
            ? "0 12px 36px rgba(11,31,72,0.1)"
            : "0 1px 2px rgba(11,31,72,0.05)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          cursor: "pointer",
          transform: hovered ? "translateY(-4px)" : "none",
          transition:
            "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.22s, box-shadow 0.22s",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Thumbnail */}
        <div
          style={{
            position: "relative",
            height: 162,
            overflow: "hidden",
            flexShrink: 0,
            background: "#06182F",
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
                background: fallback.gradient,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-end",
                padding: 14,
              }}
            >
              {/* Glow */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 120,
                  height: 120,
                  background: `radial-gradient(circle, ${fallback.glow}, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />

              {/* Brand */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <img
                  src="/rateup-star.png"
                  alt=""
                  style={{ width: 16, height: 16 }}
                />
                <span
                  style={{
                    fontFamily: "Nunito, sans-serif",
                    fontWeight: 900,
                    fontSize: 10,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  Rate<span style={{ color: "#4FC3FF" }}>Up</span>
                </span>
              </div>

              {/* WA badge */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: "#25D366",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <WhatsAppIcon size={14} color="#fff" />
              </div>

              {/* Category badge */}
              {post.primary_tag?.name && (
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    padding: "3px 9px",
                    borderRadius: 999,
                    marginBottom: 5,
                    display: "inline-block",
                    color: fallback.badgeColor,
                    background: fallback.badgeBg,
                    border: `1px solid ${fallback.badgeBorder}`,
                  }}
                >
                  {post.primary_tag.name}
                </div>
              )}

              {/* Thumb title */}
              <p
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 900,
                  fontSize: 13,
                  color: "#fff",
                  lineHeight: 1.2,
                  margin: 0,
                  maxWidth: 175,
                }}
              >
                {post.title.length > 40
                  ? post.title.substring(0, 40) + "…"
                  : post.title}
              </p>
            </div>
          )}
        </div>

        {/* Body */}
        <div
          style={{
            padding: "16px 18px 20px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {post.primary_tag?.name && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                padding: "3px 9px",
                borderRadius: 9999,
                color: "#1C518E",
                background: "rgba(28,81,142,0.1)",
                border: "1px solid rgba(28,81,142,0.22)",
                alignSelf: "flex-start",
              }}
            >
              {post.primary_tag.name}
            </span>
          )}

          <h3
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 16,
              color: "#0E1E3A",
              lineHeight: 1.25,
              letterSpacing: "-0.01em",
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {post.title}
          </h3>

          <p
            style={{
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "#64666A",
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {post.custom_excerpt || post.excerpt}
          </p>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: "auto",
              paddingTop: 11,
              borderTop: "1px solid #ECECEA",
            }}
          >
            {post.primary_author?.profile_image ? (
              <img
                src={post.primary_author.profile_image}
                alt={post.primary_author.name}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: "linear-gradient(135deg, #3D8BEE, #2360C8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 10,
                  color: "#fff",
                }}
              >
                {initials}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div
                style={{ fontSize: 11.5, fontWeight: 700, color: "#2E302E" }}
              >
                {post.primary_author?.name || "RateUp Team"}
              </div>
              <div style={{ fontSize: 10.5, color: "#8B8E8A" }}>
                {formattedDate}
              </div>
            </div>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                flexShrink: 0,
                background: "rgba(47,163,255,0.08)",
                border: "1px solid rgba(47,163,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4FC3FF",
                opacity: hovered ? 1 : 0,
                transform: hovered ? "none" : "translateX(-4px)",
                transition: "opacity 0.17s, transform 0.17s",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
