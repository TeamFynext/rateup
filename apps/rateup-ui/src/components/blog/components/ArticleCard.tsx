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
    <Link to={`/blog/${post.slug}`} className="no-underline text-inherit group">
      <article
        className="reveal in rounded-[20px] overflow-hidden bg-white flex flex-col h-full cursor-pointer transition-[transform,border-color,box-shadow] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] border border-[#ECECEA] shadow-[0_1px_2px_rgba(11,31,72,0.05)] hover:-translate-y-1 hover:border-[#C5D5EC] hover:shadow-[0_12px_36px_rgba(11,31,72,0.1)]"
        data-d={delay}
      >
        {/* Thumbnail */}
        <div className="relative h-[162px] overflow-hidden shrink-0 bg-[#06182F]">
          {post.feature_image ? (
            <img
              src={post.feature_image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-start justify-end p-3.5"
              style={{
                background: fallback.gradient,
              }}
            >
              {/* Glow */}
              <div
                className="absolute top-0 right-0 w-[120px] h-[120px] pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${fallback.glow}, transparent 70%)`,
                }}
              />

              {/* Brand */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.25">
                <img src="/rateup-star.png" alt="" className="w-4 h-4" />
                <span className="font-nunito font-black text-[10px] text-white/80">
                  Rate<span className="text-[#4FC3FF]">Up</span>
                </span>
              </div>

              {/* WA badge */}
              <div className="absolute top-2.5 right-2.5 w-[26px] h-[26px] rounded-[7px] bg-[#25D366] flex items-center justify-center">
                <WhatsAppIcon size={14} color="#fff" />
              </div>

              {/* Category badge */}
              {post.primary_tag?.name && (
                <div
                  className="text-[9.5px] font-bold tracking-[0.07em] uppercase py-[3px] px-[9px] rounded-full mb-1.25 inline-block"
                  style={{
                    color: fallback.badgeColor,
                    background: fallback.badgeBg,
                    borderColor: fallback.badgeBorder,
                  }}
                >
                  {post.primary_tag.name}
                </div>
              )}

              {/* Thumb title */}
              <p className="font-nunito font-black text-[13px] text-white leading-tight m-0 max-w-[175px]">
                {post.title.length > 40
                  ? post.title.substring(0, 40) + "…"
                  : post.title}
              </p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-[16px_18px_20px] flex-1 flex flex-col gap-2">
          {post.primary_tag?.name && (
            <span className="text-[10px] font-bold tracking-[0.09em] uppercase py-[3px] px-[9px] rounded-full text-[#1C518E] bg-[#1C518E]/10 border border-[#1C518E]/22 self-start">
              {post.primary_tag.name}
            </span>
          )}

          <h3 className="font-nunito font-extrabold text-[16px] text-[#0E1E3A] leading-[1.25] tracking-[-0.01em] m-0 line-clamp-2">
            {post.title}
          </h3>

          <p className="text-[12.5px] leading-[1.55] text-[#64666A] m-0 line-clamp-3">
            {post.custom_excerpt || post.excerpt}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-2 mt-auto pt-[11px] border-t border-[#ECECEA]">
            {post.primary_author?.profile_image ? (
              <img
                src={post.primary_author.profile_image}
                alt={post.primary_author.name}
                className="w-[26px] h-[26px] rounded-full object-cover"
              />
            ) : (
              <div className="w-[26px] h-[26px] rounded-full shrink-0 bg-[linear-gradient(135deg,#3D8BEE,#2360C8)] flex items-center justify-center font-nunito font-extrabold text-[10px] text-white">
                {initials}
              </div>
            )}
            <div className="flex-1">
              <div className="text-[11px] font-bold text-[#2E302E]">
                {post.primary_author?.name || "RateUp Team"}
              </div>
              <div className="text-[10.5px] text-[#8B8E8A]">
                {formattedDate}
              </div>
            </div>
            <div className="w-[26px] h-[26px] rounded-[7px] shrink-0 bg-[#2FA3FF]/8 border border-[#2FA3FF]/15 flex items-center justify-center text-[#4FC3FF] opacity-0 -translate-x-1 transition-[opacity,transform] duration-200 group-hover:opacity-100 group-hover:translate-x-0">
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
