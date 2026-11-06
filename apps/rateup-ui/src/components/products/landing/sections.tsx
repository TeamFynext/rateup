import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ArrowRight, Eyebrow } from "@/components/RateupHomePage/shared/home-ui";

/**
 * Section kit for the keyword landing pages (`/products/whatsapp-broadcast`,
 * `/products/whatsapp-business-api`, `/integrations/*`).
 *
 * The older product pages each carry a bespoke design and their own CSS module. Three more of
 * those would be three more designs to keep in step, so these pages compose the homepage's own
 * primitives from `home-ui` instead — same eyebrow, same closing band — and this
 * file holds only the arrangements those pages repeat.
 */

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
