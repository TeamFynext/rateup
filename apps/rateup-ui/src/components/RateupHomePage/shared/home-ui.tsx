import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { BOOK_DEMO_ROUTE } from "../helper/BookDemoLink";
import { WhatsAppMark } from "./channel-marks";

/**
 * Shared primitives for the homepage sections.
 *
 * The marketing design repeats four things on every band — a WhatsApp glyph, an eyebrow
 * chip, the "Book a Demo" button and the WhatsApp button — so they live here rather than
 * being re-typed nine times. Colour comes from the `ru-*` palette in `styles/foundation.css`, which
 * is the same ramp the design was drawn against.
 */

/** Click-to-chat link for the support number. Mirrors the one in `BookDemoPage`. */
export const WHATSAPP_HREF = `https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP}?text=${encodeURIComponent(
  "Hi, I would like to know more about RateUp",
)}`;

/* The zero state has to be written before the browser paints, or the final figure flashes
   on screen and then snaps back to 0 to count up. `useLayoutEffect` is a no-op on the
   server, and React warns if a component reaches for it during SSR, so swap it out there. */
export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

interface ParsedMetric {
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
  grouped: boolean;
}

/**
 * Splits a display figure into the part that counts and the parts that don't — "3.1×",
 * "+44%", "₹8.4L" and "12,480" all animate, while "Zero" and "N/A" have no number to
 * animate and are returned as null so the caller renders them untouched.
 */
function parseMetric(value: string): ParsedMetric | null {
  const match = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(value);
  if (!match) return null;

  const [, prefix, digits, suffix] = match;
  const plain = digits.replaceAll(",", "");
  const dot = plain.indexOf(".");

  return {
    prefix,
    suffix,
    target: Number(plain),
    /* Count in the same precision the final figure is written in, so "3.1×" ticks
       through tenths rather than jumping 0 → 1 → 2 → 3. */
    decimals: dot === -1 ? 0 : plain.length - dot - 1,
    grouped: digits.includes(","),
  };
}

function formatMetric(n: number, parsed: ParsedMetric): string {
  const body = parsed.grouped
    ? n.toLocaleString("en-IN", {
        minimumFractionDigits: parsed.decimals,
        maximumFractionDigits: parsed.decimals,
      })
    : n.toFixed(parsed.decimals);
  return `${parsed.prefix}${body}${parsed.suffix}`;
}

/**
 * A headline figure that counts up from zero the first time it scrolls into view.
 *
 * The final value is what renders on the server, so crawlers and no-JS readers get the
 * real number; the animation only ever replaces it client-side. Changing `value` re-runs
 * the count, which is what makes the case-study stats re-animate when the case switches.
 */
export function CountUp({
  value,
  className = "",
  durationMs = 1300,
}: Readonly<{ value: string; className?: string; durationMs?: number }>) {
  const ref = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const settle = () => {
      el.textContent = value;
    };

    const parsed = parseMetric(value);
    if (!parsed) return settle();
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return settle();

    el.textContent = formatMetric(0, parsed);

    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / durationMs, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = formatMetric(parsed.target * eased, parsed);
          if (p < 1) raf = requestAnimationFrame(tick);
          else settle();
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.25 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {value}
    </span>
  );
}

/**
 * Flips to `true` the first time the element scrolls into view, and stays there.
 *
 * It starts out `true`, so the finished state is what the server renders and what a reader
 * without JS keeps; the collapsed state is written in the first client layout pass, before
 * paint. That is the same order `CountUp` uses, and it is what stops the chart from showing
 * its bars full-height for a frame and then dropping them to zero to grow.
 */
export function useReveal<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(true);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    setRevealed(false);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setRevealed(true);
      },
      { threshold },
    );
    io.observe(el);

    return () => io.disconnect();
  }, [threshold]);

  return [ref, revealed] as const;
}

export function WhatsAppGlyph({ className = "size-3.5" }: Readonly<{ className?: string }>) {
  return <WhatsAppMark className={className} />;
}

/** The WhatsApp glyph on its brand-green rounded tile, as the design uses it inside buttons. */
export function WhatsAppTile({
  className = "size-6 rounded-md",
  glyphClassName = "size-3.5",
}: Readonly<{ className?: string; glyphClassName?: string }>) {
  return (
    <span
      className={`inline-flex flex-none items-center justify-center bg-wa-green text-white ${className}`}
    >
      <WhatsAppGlyph className={glyphClassName} />
    </span>
  );
}

export function ArrowRight({ className = "size-4" }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ className = "size-4" }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

/** The pill that labels each band — a bordered icon disc plus an uppercase caption. */
export function Eyebrow({
  icon,
  children,
  className = "",
}: Readonly<{ icon: ReactNode; children: ReactNode; className?: string }>) {
  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-full border border-ru-blue-200 bg-ru-blue-50 py-2 pr-4 pl-2.5 ${className}`}
    >
      <span className="flex size-7 flex-none items-center justify-center rounded-full border border-ru-blue-200 bg-white text-ru-blue-600">
        {icon}
      </span>
      <span className="text-[13px] font-semibold tracking-[0.09em] text-ru-blue-600 uppercase">
        {children}
      </span>
    </div>
  );
}

/** Solid blue CTA. Every "Book a Demo" on the site lands on `/book-a-demo`. */
export function BookDemoCta({
  children = "Book a Demo",
  className = "",
  showArrow = true,
  onDark = false,
}: Readonly<{
  children?: ReactNode;
  className?: string;
  showArrow?: boolean;
  /** On navy the brand blue sinks into the ground, so the fill steps up a stop and gains an edge. */
  onDark?: boolean;
}>) {
  const tone = onDark
    ? "border border-white/18 bg-ru-blue-500 shadow-[0_8px_22px_rgba(4,12,24,0.35)] hover:bg-ru-blue-400"
    : "bg-ru-blue-600 shadow-[0_8px_22px_rgba(28,81,142,0.2)] hover:bg-ru-blue-700";

  return (
    <Link
      to={BOOK_DEMO_ROUTE}
      className={`inline-flex h-13.5 items-center gap-2.5 rounded-lg px-7 text-[17px] font-semibold tracking-[-0.005em] text-white transition-colors ${tone} ${className}`}
    >
      {children}
      {showArrow && <ArrowRight />}
    </Link>
  );
}

/** Outlined companion CTA that opens the support number in WhatsApp. */
export function WhatsAppCta({
  children = "Chat with us on WhatsApp",
  className = "",
  onDark = false,
}: Readonly<{ children?: ReactNode; className?: string; onDark?: boolean }>) {
  const tone = onDark
    ? "border-white/22 bg-white/6 text-white hover:bg-white/12"
    : "border-ru-n-200 bg-white text-ru-n-700 shadow-xs hover:border-ru-n-300";

  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex h-13.5 items-center gap-2.5 rounded-lg border px-5.5 text-[17px] font-semibold transition-colors ${tone} ${className}`}
    >
      <WhatsAppTile />
      {children}
    </a>
  );
}

/**
 * The hero wash, as `HeroSectionNew` and `BookDemoPage` draw it — cream at the top settling
 * into `#fcfcfd` (the value behind `ink-25`), so the band dissolves into the sections below.
 * A constant rather than four copies of the gradient, since every page that opens with a
 * hero has to match it exactly or the site reads as two different sites.
 */
export const HERO_WASH =
  "border-b border-b-[#f1eadd] bg-[linear-gradient(180deg,#fffaf0_0%,#fefcf8_55%,#fcfcfd_100%)]";

/**
 * Pulls a hero band up under the sticky header so the wash runs to the top of the page and
 * reads around the nav's floating pill; the padding adds that height back.
 *
 * The pull equals `RateupNavbar`'s full height — wrapper `py-2`/`sm:py-4` + pill
 * `py-2`/`sm:py-2.5` + the tallest child (the `h-11.5` CTA at 46px, then the `sm:h-12` logo
 * at 48px) = 78px, then 100px from `sm`. The padding is that plus the design's 28px/48px of
 * air above the headline, which is the same pair `HeroSectionNew` uses — a page opening on
 * more than the homepage does reads as a mistake. Revisit both if the navbar's height
 * changes.
 */
export const HERO_UNDER_NAV = "-mt-19.5 pt-26.5 sm:-mt-25 sm:pt-37";

/**
 * The navy closing band every marketing page ends on, as the homepage's `LoyaltySection`
 * draws it. It is the one dark surface on the site, which is what makes it read as the end
 * of the page rather than another section — so it lives here and the pages pass copy.
 */
export function ClosingCta({
  eyebrow,
  title,
  children,
  note = "No credit card required · Cancel anytime",
  id,
  decoration,
}: Readonly<{
  /** The small dotted pill above the headline. Omitted when a page has nothing to add. */
  eyebrow?: ReactNode;
  title: ReactNode;
  children: ReactNode;
  note?: ReactNode;
  id?: string;
  /** Drawn behind the copy, above the navy. The homepage passes the hero's line field. */
  decoration?: ReactNode;
}>) {
  return (
    <section id={id} className="relative overflow-hidden bg-ru-blue-950">
      {decoration}
      <div className="absolute top-[-14%] left-1/2 aspect-2/1 w-[min(1000px,120%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(90,140,198,0.2)_0%,transparent_62%)]" />

      <div className="relative mx-auto max-w-280 px-5 py-14 sm:py-26">
        <div className="mx-auto max-w-190 text-center">
          {eyebrow && (
            <div className="mb-6 inline-flex items-center gap-2.25 rounded-full border border-white/14 bg-white/5 py-1.25 pr-3.5 pl-1.25">
              <span className="size-4.5 flex-none rounded-full bg-ru-star" />
              <span className="text-[13.5px] font-medium text-white/76">{eyebrow}</span>
            </div>
          )}

          <h2 className="mb-4.5 font-display text-[clamp(2.125rem,5.4vw,3.75rem)]/[1.05] font-bold tracking-[-0.035em] text-balance text-white">
            {title}
          </h2>
          <p className="mx-auto mb-7 max-w-[52ch] text-[clamp(1.0625rem,2.1vw,1.28125rem)]/[1.6] text-pretty text-white/68 sm:mb-9">
            {children}
          </p>

          <div className="mb-4 flex flex-wrap justify-center gap-3">
            <Link
              to={BOOK_DEMO_ROUTE}
              className="inline-flex h-13.5 items-center gap-2.5 rounded-lg bg-white px-7 text-[17px] font-semibold text-ru-blue-700 transition-transform hover:-translate-y-px hover:text-ru-blue-800 max-sm:w-full max-sm:justify-center"
            >
              Book a Demo
              <ArrowRight />
            </Link>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-13.5 items-center gap-2.5 rounded-lg border border-white/22 bg-white/6 px-5.5 text-[17px] font-semibold text-white transition-colors hover:bg-white/12 max-sm:w-full max-sm:justify-center"
            >
              <WhatsAppTile />
              Chat with us on WhatsApp
            </a>
          </div>

          {note && <div className="text-sm text-white/50">{note}</div>}
        </div>
      </div>
    </section>
  );
}
