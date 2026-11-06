import type { ReactNode } from "react";

/** Small shared pieces the Shopify page's bands repeat. */

export function Overline({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-blue-600 uppercase">
      {children}
    </span>
  );
}

export function H2({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <h2 className="font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-ru-n-700">
      {children}
    </h2>
  );
}

export function Card({
  children,
  tone = "surface",
}: Readonly<{ children: ReactNode; tone?: "surface" | "quiet" }>) {
  return (
    <div
      className={`rounded-xl p-6 shadow-xs ring-1 ring-ru-n-200 ring-inset ${
        tone === "quiet" ? "bg-ru-n-50" : "bg-white"
      }`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="font-display text-base/[1.35] font-medium tracking-[-0.01em] text-ru-n-700">
      {children}
    </span>
  );
}

export function Tag({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="inline-flex h-5.5 items-center rounded-md border border-ru-n-200 bg-ru-n-50 px-2.5 text-[12.5px] text-ru-n-600">
      {children}
    </span>
  );
}

const BADGE_TONE = {
  accent: "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600",
  neutral: "border-ru-n-200 bg-ru-n-50 text-ru-n-500",
  outline: "border-ru-n-200 bg-transparent text-ru-n-600",
  warm: "border-ru-amber-200 bg-ru-amber-50 text-ru-amber-700",
} as const;

export function Badge({
  tone = "neutral",
  children,
}: Readonly<{ tone?: keyof typeof BADGE_TONE; children: ReactNode }>) {
  return (
    <span
      className={`inline-flex h-5 items-center gap-1.5 rounded-4xl border px-2 text-xs font-medium whitespace-nowrap ${BADGE_TONE[tone]}`}
    >
      {children}
    </span>
  );
}

/** The arrow the design puts after an inline "see also" link. */
export function LinkArrow() {
  return <span aria-hidden="true"> →</span>;
}
