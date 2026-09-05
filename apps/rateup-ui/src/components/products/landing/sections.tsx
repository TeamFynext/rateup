import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";

import {
  ArrowRight,
  BookDemoCta,
  CheckIcon,
  Eyebrow,
  HERO_UNDER_NAV,
  HERO_WASH,
  WhatsAppCta,
} from "@/components/RateupHomePage/shared/home-ui";

/**
 * Section kit for the keyword landing pages (`/products/whatsapp-broadcast`,
 * `/products/whatsapp-business-api`, `/integrations/*`).
 *
 * The older product pages each carry a bespoke design and their own CSS module. Three more of
 * those would be three more designs to keep in step, so these pages compose the homepage's own
 * primitives from `home-ui` instead — same hero wash, same eyebrow, same closing band — and this
 * file holds only the arrangements those pages repeat.
 */

/** Bulleted proof chips under a hero headline. */
function HeroPoints({ points }: Readonly<{ points: readonly string[] }>) {
  return (
    <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2.5">
      {points.map((point) => (
        <li key={point} className="flex items-center gap-2 text-[15.5px] text-ru-n-600">
          <span className="flex size-5 flex-none items-center justify-center rounded-full bg-ru-green-50 text-ru-green-600">
            <CheckIcon className="size-3" />
          </span>
          {point}
        </li>
      ))}
    </ul>
  );
}

export function LandingHero({
  eyebrow,
  eyebrowIcon,
  title,
  children,
  points,
}: Readonly<{
  eyebrow: string;
  eyebrowIcon: ReactNode;
  /** The page's single H1. Keep the focus keyword in it. */
  title: ReactNode;
  children: ReactNode;
  points?: readonly string[];
}>) {
  return (
    <section className={`${HERO_WASH} ${HERO_UNDER_NAV} pb-14 sm:pb-22`}>
      <div className="mx-auto max-w-280 px-5 text-center">
        <Eyebrow className="mb-6" icon={eyebrowIcon}>
          {eyebrow}
        </Eyebrow>
        <h1 className="mx-auto max-w-[20ch] font-display text-[clamp(2.125rem,5.6vw,3.875rem)]/[1.05] font-bold tracking-[-0.035em] text-balance text-ru-n-700">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-[58ch] text-[clamp(1.0625rem,2.1vw,1.28125rem)]/[1.6] text-pretty text-ru-n-500">
          {children}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <BookDemoCta className="max-sm:w-full max-sm:justify-center" />
          <WhatsAppCta className="max-sm:w-full max-sm:justify-center" />
        </div>
        {points && <HeroPoints points={points} />}
      </div>
    </section>
  );
}

/** A page band: eyebrow, H2, optional lead, then whatever the section renders. */
export function Band({
  id,
  eyebrow,
  eyebrowIcon,
  title,
  lead,
  children,
  tone = "default",
}: Readonly<{
  id?: string;
  eyebrow?: string;
  eyebrowIcon?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  /** `muted` is the alternating grey band the homepage uses to separate adjacent sections. */
  tone?: "default" | "muted";
}>) {
  return (
    <section
      id={id}
      className={
        tone === "muted"
          ? "border-y border-ru-n-100 bg-ru-n-50"
          : "border-b border-ru-n-100 bg-white"
      }
    >
      <div className="mx-auto max-w-280 px-5 py-12 sm:py-22">
        <div className="mb-8 max-w-160 sm:mb-11">
          {eyebrow && eyebrowIcon && (
            <Eyebrow className="mb-4.5" icon={eyebrowIcon}>
              {eyebrow}
            </Eyebrow>
          )}
          <h2 className="font-display text-[clamp(1.6875rem,3.8vw,2.375rem)]/[1.12] font-bold tracking-[-0.028em] text-balance text-ru-n-700">
            {title}
          </h2>
          {lead && <p className="mt-4 max-w-[62ch] text-[16.5px]/[1.6] text-ru-n-500">{lead}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

export interface FeatureItem {
  title: string;
  body: string;
  /** Path of an SVG glyph, drawn on the shared 24×24 stroked grid. */
  icon: ReactNode;
}

export function FeatureGrid({ items }: Readonly<{ items: readonly FeatureItem[] }>) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
      {items.map((item) => (
        <div
          key={item.title}
          className="flex flex-col gap-3.5 rounded-[20px] border border-ru-n-200 bg-white p-5.5 transition-all hover:border-ru-n-300 hover:shadow-md sm:p-7"
        >
          <span className="flex size-9.5 items-center justify-center rounded-[10px] border border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4.75"
              aria-hidden="true"
            >
              {item.icon}
            </svg>
          </span>
          <div>
            <h3 className="mb-1.5 font-display text-[19.5px] font-bold tracking-[-0.02em] text-ru-n-700">
              {item.title}
            </h3>
            <p className="text-[15.5px]/[1.55] text-ru-n-500">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface Step {
  title: string;
  body: string;
}

export function Steps({ steps }: Readonly<{ steps: readonly Step[] }>) {
  return (
    <ol className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="rounded-[20px] border border-ru-n-200 bg-white p-5.5 sm:p-7"
        >
          <span className="font-display text-[13px] font-bold tracking-[0.09em] text-ru-amber-600 uppercase">
            Step {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-2.5 mb-1.5 font-display text-[19.5px] font-bold tracking-[-0.02em] text-ru-n-700">
            {step.title}
          </h3>
          <p className="text-[15.5px]/[1.55] text-ru-n-500">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

export interface Faq {
  question: string;
  answer: string;
}

/**
 * FAQ accordion.
 *
 * Every answer is in the DOM whether or not its panel is open — `hidden` toggles visibility
 * rather than the list being built from open state — because the `FAQPage` JSON-LD claims the
 * answers are on the page, and Google requires the text to actually be there.
 */
export function FaqList({ faqs }: Readonly<{ faqs: readonly Faq[] }>) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto flex max-w-205 flex-col gap-3">
      {faqs.map((faq, index) => {
        const open = openIndex === index;
        return (
          <div
            key={faq.question}
            className={`overflow-hidden rounded-2xl border transition-colors ${
              open ? "border-ru-blue-200 bg-ru-blue-50" : "border-ru-n-200 bg-white"
            }`}
          >
            <h3>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-5.5 py-5 text-left font-display text-[17.5px] font-bold tracking-[-0.015em] text-ru-n-700 sm:px-6.5"
              >
                {faq.question}
                <span className="relative size-6 flex-none">
                  <span
                    className={`absolute top-1/2 left-0 h-0.5 w-6 -translate-y-1/2 rounded-full bg-ru-n-400 transition-transform ${open ? "" : ""}`}
                  />
                  <span
                    className={`absolute top-0 left-1/2 h-6 w-0.5 -translate-x-1/2 rounded-full bg-ru-n-400 transition-transform ${open ? "scale-y-0" : "scale-y-100"}`}
                  />
                </span>
              </button>
            </h3>
            <div hidden={!open} className="px-5.5 pb-5 sm:px-6.5">
              <p className="max-w-[72ch] text-[15.5px]/[1.65] text-ru-n-600">{faq.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The internal-link band at the foot of every keyword page. These pages exist partly to be link
 * hubs, so the cross-links are a section rather than a stray sentence.
 */
export function RelatedLinks({
  links,
}: Readonly<{ links: readonly { to: string; label: string; body: string }[] }>) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="group flex flex-col gap-2 rounded-[20px] border border-ru-n-200 bg-white p-5.5 transition-all hover:border-ru-blue-300 hover:shadow-md"
        >
          <span className="flex items-center gap-2 font-display text-[17.5px] font-bold tracking-[-0.02em] text-ru-n-700 group-hover:text-ru-blue-600">
            {link.label}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="text-[15px]/[1.5] text-ru-n-500">{link.body}</span>
        </Link>
      ))}
    </div>
  );
}
