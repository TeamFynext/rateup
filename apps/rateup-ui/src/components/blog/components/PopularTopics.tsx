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
    <div className="rounded-[28px] bg-white border border-[#ECECEA] shadow-[0_1px_2px_rgba(11,31,72,0.05)] pt-[18px] px-5 pb-5">
      <h3 className="font-nunito font-extrabold text-[15px] text-[#0E1E3A] tracking-[-0.01em] mb-[13px] mt-0 mx-0">
        Popular Topics
      </h3>

      <div className="flex flex-col gap-1.25">
        {topicsToDisplay.map((tag, i) => {
          const style = topicStyles[i % topicStyles.length];
          return (
            <Link
              key={tag.id}
              to={`/blog/tag/${encodeURIComponent(tag.slug)}`}
              className="flex items-center gap-2.25 py-2 px-2.75 rounded-[10px] bg-[#F4F5F2] hover:bg-[#EDF0EC] border border-[#E8EAE6] hover:border-[#D5D8D5] no-underline transition-all duration-150"
            >
              <div
                className="w-7 h-7 rounded-[7px] shrink-0 flex items-center justify-center"
                style={{
                  background: style.iconBg,
                  borderColor: style.iconBorder,
                  color: style.iconColor,
                }}
              >
                {style.icon}
              </div>
              <span className="flex-1 text-[12.5px] font-semibold text-[#2E302E] leading-[1.25]">
                {tag.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
