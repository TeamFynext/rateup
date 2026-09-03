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

  const formattedDate = new Date(post.published_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="group/featured rounded-[28px] overflow-hidden bg-white border border-border shadow-[0_1px_3px_rgba(11,31,72,0.06),0_8px_24px_rgba(11,31,72,0.06)] grid grid-cols-[1.2fr_1fr] transition-all duration-[220ms] hover:border-[#C5D5EC] hover:shadow-[0_16px_48px_rgba(11,31,72,0.1)]">
      {/* Thumbnail */}
      <div className="relative min-h-[340px] overflow-hidden bg-[#06182F] border-r border-border">
        {post.feature_image ? (
          <img src={post.feature_image} alt={post.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#082040_0%,#0C2B54_45%,#071A33_100%)] flex flex-col items-start justify-end p-[22px]">
            {/* Glow */}
            <div className="absolute -top-5 -right-5 w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(47,163,255,0.3),transparent_70%)] pointer-events-none" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-[32px] px-[30px] pb-[30px] flex flex-col justify-center gap-3">
        {post.primary_tag?.name && (
          <span className="inline-block self-start text-[10.5px] font-bold tracking-[0.09em] uppercase py-1 px-[11px] rounded-full text-primary bg-primary/10 border border-primary/22">
            {post.primary_tag.name}
          </span>
        )}

        <h2 className="font-nunito font-black text-[#0E1E3A] text-[clamp(21px,2.2vw,28px)] leading-[1.15] tracking-[-0.02em] m-0">
          {post.title}
        </h2>

        <p className="text-[14px] leading-[1.62] text-muted-foreground m-0 line-clamp-5">
          {post.custom_excerpt || post.excerpt}
        </p>

        <div className="flex items-center gap-[10px] mt-auto pt-4 border-t border-border">
          {post.primary_author?.profile_image ? (
            <img
              src={post.primary_author.profile_image}
              alt={post.primary_author.name}
              className="w-[34px] h-[34px] rounded-full object-cover"
            />
          ) : (
            <div className="w-[34px] h-[34px] rounded-full shrink-0 bg-[linear-gradient(135deg,#3D8BEE,#2360C8)] flex items-center justify-center font-nunito font-extrabold text-[13px] text-white">
              {initials}
            </div>
          )}
          <div className="flex-1">
            <div className="font-bold text-[12.5px] text-[#0E1E3A]">
              {post.primary_author?.name || "RateUp Team"}
            </div>
            <div className="text-[11.5px] text-muted-foreground">{formattedDate}</div>
          </div>
          <Link
            to="/blog/$slug"
            params={{ slug: post.slug }}
            className="inline-flex items-center gap-[7px] text-[13.5px] font-bold text-primary py-[9px] px-[18px] rounded-[9px] bg-accent border border-ru-blue-200 no-underline transition-all duration-200 hover:bg-ru-blue-100 hover:border-ru-blue-300 hover:text-[#0E2B52] hover:translate-x-0.5"
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
