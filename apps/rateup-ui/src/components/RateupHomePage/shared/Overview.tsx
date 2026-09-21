import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { MetaLockup } from "@/components/integrations/logos";

import { CAPABILITIES, type Capability } from "./capabilities";
import { ArrowRight, Eyebrow, useReveal } from "./home-ui";

const CARD_CLASS =
  "group flex h-full flex-col gap-2.5 rounded-2xl border border-ru-n-200 bg-white p-4.5 text-left transition-all hover:-translate-y-0.5 hover:border-ru-blue-300 hover:shadow-md motion-reduce:transition-none sm:p-5.5";

function CapabilityCard({ capability }: Readonly<{ capability: Capability }>) {
  const content = (
    <>
      <span className="flex size-10 flex-none items-center justify-center rounded-[10px] border border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600 transition-colors group-hover:border-ru-blue-600 group-hover:bg-ru-blue-600 group-hover:text-white">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden="true"
        >
          {capability.icon}
        </svg>
      </span>
      <span className="flex items-center gap-1.5 font-display text-[17px] font-bold tracking-[-0.015em] text-ru-n-700 sm:text-[18.5px]">
        {capability.label}
        {capability.to && (
          <ArrowRight className="size-4 -translate-x-1 text-ru-blue-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none max-sm:hidden" />
        )}
      </span>
      <span className="text-[14.5px]/[1.5] text-ru-n-500 sm:text-[15px]/[1.55]">
        {capability.body}
      </span>
    </>
  );

  return capability.to ? (
    <Link to={capability.to} className={CARD_CLASS}>
      {content}
    </Link>
  ) : (
    <div className={CARD_CLASS}>{content}</div>
  );
}

function TrustChip({ icon, children }: Readonly<{ icon: ReactNode; children: ReactNode }>) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ru-n-200 bg-white px-3.25 py-1.75">
      {icon}
      <span className="text-[13.5px] font-medium text-ru-n-600">{children}</span>
    </span>
  );
}

export default function Overview() {
  const [gridRef, shown] = useReveal<HTMLUListElement>(0.12);

  return (
    /* The band rides up over the hero's navy as a rounded sheet. A gradient fade between the
       two goes muddy halfway: navy into cream passes through grey-brown. */
    <section className="relative -mt-8 rounded-t-4xl bg-ru-n-25 px-5 pt-12 pb-12 sm:-mt-10 sm:rounded-t-[2.5rem] sm:pt-20 sm:pb-18">
      <div className="mx-auto max-w-280">
        <div className="mx-auto mb-8 max-w-190 text-center sm:mb-12">
          <Eyebrow
            className="mb-5.5"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5"
                aria-hidden="true"
              >
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
                <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
              </svg>
            }
          >
            What RateUp does
          </Eyebrow>
          <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
            All of it runs on <span className="text-[#0F8C4C]">WhatsApp</span>, automatically.
          </h2>
          <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
            No new apps for your customers. No extra work for your team.
          </p>
        </div>

        <ul
          ref={gridRef}
          className="mb-7 grid list-none grid-cols-2 gap-3 p-0 sm:mb-9 sm:gap-4 lg:grid-cols-4"
        >
          {CAPABILITIES.map((capability, i) => (
            <li
              key={capability.label}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`motion-reduce:animate-none ${shown ? "animate-ru-rise" : "opacity-0"}`}
            >
              <CapabilityCard capability={capability} />
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {/* The lockup carries the "Meta" wordmark, so the chip's own label drops it. */}
          <TrustChip icon={<MetaLockup className="h-2.5" />}>Business Partner</TrustChip>
          <TrustChip
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.75 text-ru-n-500"
                aria-hidden="true"
              >
                <path d="M4 8h16l-1.4 11a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 8Z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
            }
          >
            Works with Shopify &amp; WooCommerce
          </TrustChip>
        </div>
      </div>
    </section>
  );
}
