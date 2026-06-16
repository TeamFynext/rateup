import { Link } from "@tanstack/react-router";

import type { Tag } from "@/lib/posts.ts";

// We can define a set of icons and colors for popular topics
const topicStyles = [
  {
    iconColor: "#4FC3FF",
    iconBg: "rgba(47,163,255,0.12)",
    iconBorder: "rgba(47,163,255,0.15)",
    icon: (
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
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      </svg>
    ),
  },
  {
    iconColor: "#4ADE80",
    iconBg: "rgba(37,211,102,0.1)",
    iconBorder: "rgba(37,211,102,0.18)",
    icon: (
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
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    ),
  },
  {
    iconColor: "#FFB638",
    iconBg: "rgba(248,149,29,0.1)",
    iconBorder: "rgba(248,149,29,0.18)",
    icon: (
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
        <path d="M3 11l18-5v12L3 14v-3z" />
      </svg>
    ),
  },
  {
    iconColor: "#A99BF5",
    iconBg: "rgba(139,123,240,0.1)",
    iconBorder: "rgba(139,123,240,0.18)",
    icon: (
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
        <path d="M3 3v18h18" />
        <path d="M18 9l-5 5-3-3-4 4" />
      </svg>
    ),
  },
  {
    iconColor: "#4FC3FF",
    iconBg: "rgba(47,163,255,0.12)",
    iconBorder: "rgba(47,163,255,0.15)",
    icon: (
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
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M18 6a6 6 0 0 1-6 6 6 6 0 0 0-6 6" />
        <circle cx="18" cy="6" r="3" />
      </svg>
    ),
  },
];

export function PopularTopics({ tags }: { tags: Tag[] }) {
  if (!tags || tags.length === 0) return null;

  const topicsToDisplay = tags.slice(0, 5);

  return (
    <div
      style={{
        borderRadius: 28,
        background: "#fff",
        border: "1px solid #ECECEA",
        boxShadow: "0 1px 2px rgba(11,31,72,0.05)",
        padding: "18px 20px 20px",
      }}
    >
      <h3
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: 15,
          color: "#0E1E3A",
          letterSpacing: "-0.01em",
          margin: "0 0 13px",
        }}
      >
        Popular Topics
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {topicsToDisplay.map((tag, i) => {
          const style = topicStyles[i % topicStyles.length];
          return (
            <Link
              key={tag.id}
              to={`/blog/tag/${encodeURIComponent(tag.slug)}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 11px",
                borderRadius: 10,
                background: "#F4F5F2",
                border: "1px solid #E8EAE6",
                textDecoration: "none",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "#EDF0EC";
                el.style.borderColor = "#D5D8D5";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "#F4F5F2";
                el.style.borderColor = "#E8EAE6";
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: style.iconBg,
                  border: `1px solid ${style.iconBorder}`,
                  color: style.iconColor,
                }}
              >
                {style.icon}
              </div>
              <span
                style={{
                  flex: 1,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#2E302E",
                  lineHeight: 1.25,
                }}
              >
                {tag.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
