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
 * being re-typed nine times. Colour comes from the `ru-*` palette in `globals.css`, which
 * is the same ramp the design was drawn against.
 */

/** Click-to-chat link for the support number. Mirrors the one in `BookDemoPage`. */
export const WHATSAPP_HREF = `https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP}?text=${encodeURIComponent(
  "Hi, I would like to know more about RateUp",
)}`;

/* The zero state has to be written before the browser paints, or the final figure flashes
   on screen and then snaps back to 0 to count up. `useLayoutEffect` is a no-op on the
   server, and React warns if a component reaches for it during SSR, so swap it out there. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

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
}: Readonly<{ children?: ReactNode; className?: string; showArrow?: boolean }>) {
  return (
    <Link
      to={BOOK_DEMO_ROUTE}
      className={`inline-flex h-13.5 items-center gap-2.5 rounded-lg bg-ru-blue-600 px-7 text-[17px] font-semibold tracking-[-0.005em] text-white shadow-[0_8px_22px_rgba(28,81,142,0.2)] transition-colors hover:bg-ru-blue-700 ${className}`}
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
}: Readonly<{ children?: ReactNode; className?: string }>) {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex h-13.5 items-center gap-2.5 rounded-lg border border-ru-n-200 bg-white px-5.5 text-[17px] font-semibold text-ru-n-700 shadow-xs transition-colors hover:border-ru-n-300 ${className}`}
    >
      <WhatsAppTile />
      {children}
    </a>
  );
}
