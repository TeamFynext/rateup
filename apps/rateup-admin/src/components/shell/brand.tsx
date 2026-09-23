import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

/*
 * The real brand marks, copied into public/ from the same CloudFront originals rateup.app
 * uses. They are served from here rather than hotlinked: the console is meant to make no
 * request off its own origin, and a staff tool should not go dark because a CDN path moved.
 */

/**
 * The RateUp star on its own. Used wherever the name is already written beside it — the top
 * bar, the rail, the phone menu — so the mark reads at small sizes and in either theme.
 */
export function RateUpStar({ className }: { className?: string }) {
  return (
    <img
      src="/rateup-star.svg"
      alt=""
      aria-hidden="true"
      width={28}
      height={26}
      className={cn("size-6 shrink-0 select-none", className)}
      draggable={false}
    />
  );
}

/**
 * The full lockup: the star over "RateUp" in brand navy. That navy is unreadable on a dark
 * background, and tinting it turns the star yellow and the type electric blue — the one
 * thing a logo may not do. So dark mode shows the star beside the name instead, which is
 * the same mark in the colours it was drawn in.
 */
export function RateUpLogo({ className }: { className?: string }) {
  return (
    <>
      <img
        src="/logo.svg"
        alt="RateUp"
        width={110}
        height={62}
        className={cn("h-12 w-auto select-none dark:hidden", className)}
        draggable={false}
      />
      <span className="hidden items-center gap-2.5 dark:flex">
        <RateUpStar className="size-9" />
        <span className="text-[26px] font-semibold tracking-tight">RateUp</span>
      </span>
    </>
  );
}

/** The star and the product's name, linking home. The console's own header mark. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="RateUp Admin, home"
      className={cn("flex items-center gap-2.5 text-foreground", className)}
    >
      <RateUpStar className="size-7" />
      <span className="flex items-baseline gap-2">
        <span className="text-[22px] font-semibold tracking-tight">RateUp</span>
        <span className="text-sm font-medium text-muted-foreground">Admin</span>
      </span>
    </Link>
  );
}
