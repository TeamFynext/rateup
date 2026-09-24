import { Link } from "@tanstack/react-router";

import { isStaffMock } from "@/api/auth.api";
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
 * The horizontal lockup, the same `rateup.png` / `rateup-white.png` the rateup.app navbar
 * shows (rateup-ui's `RateupLockup`), with the white one in dark mode.
 *
 * Both PNGs are 2500×992 but the lockup only covers x 289–2214, y 298–759; the rest is
 * transparent. The frame takes the lockup's own ratio and the image is scaled and offset to
 * fill it, so `className` sizes what is visible. Re-measure if either asset is replaced.
 */
export function RateUpLogo({ className }: { className?: string }) {
  const img = "absolute top-[-64.5%] left-[-15%] h-auto w-[129.8%] max-w-none select-none";
  return (
    <span
      role="img"
      aria-label="RateUp"
      className={cn("relative block aspect-[1926/462] h-8 flex-none overflow-hidden", className)}
    >
      <img src="/rateup.png" alt="" className={cn(img, "dark:hidden")} draggable={false} />
      <img
        src="/rateup-white.png"
        alt=""
        className={cn(img, "hidden dark:block")}
        draggable={false}
      />
    </span>
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

const APP_ENV = import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE;
const SHORT_ENV: Record<string, string> = { development: "dev", production: "prod" };
const ENV_LABEL = SHORT_ENV[APP_ENV] ?? APP_ENV;

/** Which deployment this is; red in production, where a mistake reaches customers. */
export function EnvPill({ className }: { className?: string }) {
  const isProd = APP_ENV === "production";
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        isProd ? "bg-destructive text-white" : "bg-chart-5/20 text-chart-5",
        className,
      )}
    >
      {isStaffMock ? `${ENV_LABEL} · mock` : ENV_LABEL}
    </span>
  );
}
