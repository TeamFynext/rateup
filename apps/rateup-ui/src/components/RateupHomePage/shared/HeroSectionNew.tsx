import type { ReactNode } from "react";

import { MetaLockup } from "@/components/integrations/logos";

import { InstagramMark, MessengerMark } from "./channel-marks";
import { BookDemoCta, WhatsAppCta, WhatsAppGlyph } from "./home-ui";

/**
 * The channel word cycles under a fixed headline. The column holds four cells and
 * `animate-ru-rot` steps it -25% at a time, so the first entry has to repeat at the end
 * for the loop to close without a jump back through the list.
 */
const CHANNELS = [
  {
    name: "WhatsApp",
    textClass: "text-[#0F8C4C]",
    glyph: (
      <span className="flex size-[0.86em] flex-none items-center justify-center rounded-[0.24em] bg-wa-green text-white">
        <WhatsAppGlyph className="size-[62%]" />
      </span>
    ),
  },
  {
    name: "Instagram",
    textClass: "text-[#C13584]",
    glyph: (
      <span className="flex size-[0.86em] flex-none items-center justify-center rounded-[0.24em] bg-[linear-gradient(45deg,#FEDA75_0%,#FA7E1E_26%,#D62976_58%,#962FBF_82%,#4F5BD5_100%)] text-white">
        <InstagramMark className="size-[58%]" />
      </span>
    ),
  },
  {
    name: "Messenger",
    textClass: "text-[#0074E4]",
    glyph: (
      <span className="flex size-[0.86em] flex-none items-center justify-center rounded-[0.24em] bg-[linear-gradient(135deg,#00C6FF_0%,#0068FF_100%)] text-white">
        <MessengerMark className="size-[64%]" />
      </span>
    ),
  },
];

/* The cycle closes by repeating the first channel, so -75% lands back on WhatsApp. */
const CHANNEL_CELLS = [...CHANNELS, CHANNELS[0]];

/**
 * The seven things RateUp does, named plainly. The design puts them directly under the
 * promise line as a wrapping row of chips, so the reader sees the product's surface area
 * before the CTAs rather than having to reach the platform band for it.
 *
 * Every icon is drawn on the same 24-box at a 1.75 stroke so the row reads as one set.
 */
const CAPABILITIES: ReadonlyArray<{ label: string; icon: ReactNode }> = [
  {
    label: "Loyalty",
    icon: (
      <path d="M12 3.4l2.6 5.3 5.9.85-4.25 4.15 1 5.9-5.25-2.8-5.25 2.8 1-5.9L3.5 9.55l5.9-.85L12 3.4Z" />
    ),
  },
  {
    label: "Referral",
    icon: (
      <>
        <circle cx="6.5" cy="12" r="2.6" />
        <circle cx="17.5" cy="6" r="2.6" />
        <circle cx="17.5" cy="18" r="2.6" />
        <path d="m8.9 10.8 6.2-3.4M8.9 13.2l6.2 3.4" />
      </>
    ),
  },
  {
    label: "Feedback",
    icon: (
      <>
        <path d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z" />
        <path d="m12 8.4 1.25 2.55 2.8.4-2.02 1.98.48 2.8L12 14.8l-2.51 1.33.48-2.8-2.02-1.98 2.8-.4L12 8.4Z" />
      </>
    ),
  },
  {
    label: "Campaigns",
    icon: (
      <>
        <path d="M3.4 11.2 20.6 4.2l-6 15.9-3.15-6.75-3.15-1.35" />
        <path d="m11.45 13.35 4.15-6.4" />
      </>
    ),
  },
  {
    label: "Automation",
    icon: (
      <>
        <path d="M4 6h7.5" />
        <path d="M4 18h7.5" />
        <path d="M11.5 6a4 4 0 0 0 4 4H20" />
        <path d="M11.5 18a4 4 0 0 1 4-4H20" />
        <circle cx="20" cy="10" r="1.6" />
        <circle cx="20" cy="14" r="1.6" />
      </>
    ),
  },
  {
    label: "Meta AI Agents",
    icon: (
      <>
        <rect x="4" y="7" width="16" height="11.5" rx="3.2" />
        <path d="M12 3.2v3.8" />
        <circle cx="9.2" cy="12.6" r="1.15" fill="currentColor" stroke="none" />
        <circle cx="14.8" cy="12.6" r="1.15" fill="currentColor" stroke="none" />
        <path d="M9.8 15.8h4.4" />
      </>
    ),
  },
  {
    label: "Lead Pipelines",
    icon: <path d="M3.6 5h16.8l-6.3 7.1v6L10 20v-7.9L3.6 5Z" />,
  },
];

function CapabilityChip({ icon, label }: Readonly<{ icon: ReactNode; label: string }>) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-ru-n-200 bg-white py-2.75 pr-4 pl-3 shadow-xs">
      <span className="flex size-8 flex-none items-center justify-center rounded-lg border border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4.25"
          aria-hidden="true"
        >
          {icon}
        </svg>
      </span>
      <span className="text-[1.03125rem] font-semibold tracking-[-0.01em] whitespace-nowrap text-ru-n-700">
        {label}
      </span>
    </div>
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

export default function HeroSectionNew() {
  /* Two things from the design carry the hero's framing:
     - The same warm wash the book-demo page uses — cream at the top settling into #fcfcfd,
       the value behind `ink-25`, so the hero dissolves into the sections below it.
     - The negative top margin pulls the band up under the sticky nav — a translucent pill
       (`bg-ink-25/82` + backdrop blur) in a header that paints no background of its own — so
       the wash runs to the top of the page and reads behind the pill. The padding-top adds
       that height back, leaving the design's 28px/48px of air above the headline.

     The pull has to equal the header's full height or a strip of page ground shows above it.
     RateupNavbar is taller than the comp's nav, so this is measured off its own classes
     rather than the design's clamp: wrapper `py-2`/`sm:py-4` + pill `py-2`/`sm:py-2.5` +
     the tallest child (the `h-11.5` CTA at 46px, then the `sm:h-12` logo at 48px)
     = 78px, then 100px from `sm`. Revisit these two if the navbar's height changes. */
  return (
    <section className="-mt-19.5 border-b border-b-[#f1eadd] bg-[linear-gradient(180deg,#fffaf0_0%,#fefcf8_55%,#fcfcfd_100%)] px-5 pt-26.5 pb-6 sm:-mt-25 sm:pt-37 sm:pb-9">
      <div className="mx-auto max-w-230 text-center">
        <h1 className="mb-5.5 font-display text-[clamp(2.5rem,7.2vw,5.25rem)]/[1.05] font-bold tracking-[-0.035em] text-balance text-ru-n-700">
          Engage with your Customers on
          <span className="mt-0.5 block h-[1.14em] overflow-hidden">
            <span className="flex animate-ru-rot flex-col motion-reduce:animate-none">
              {CHANNEL_CELLS.map((channel, i) => (
                <span
                  key={`${channel.name}-${i}`}
                  className={`flex h-[1.14em] items-center justify-center gap-[0.24em] leading-[1.14] ${channel.textClass}`}
                >
                  {channel.glyph}
                  {channel.name}
                </span>
              ))}
            </span>
          </span>
        </h1>

        <p className="mx-auto mb-4 max-w-[30ch] font-display text-[clamp(1.3125rem,2.9vw,1.8125rem)]/[1.35] font-semibold tracking-[-0.02em] text-ru-n-700">
          Most customers buy once and disappear. RateUp fixes that.
        </p>
        <ul className="mx-auto mb-4.5 flex max-w-225 list-none flex-wrap justify-center gap-2.5 p-0">
          {CAPABILITIES.map((capability) => (
            <li key={capability.label}>
              <CapabilityChip icon={capability.icon} label={capability.label} />
            </li>
          ))}
        </ul>

        <p className="mx-auto mb-2 max-w-[44ch] font-display text-[clamp(1.125rem,2.3vw,1.375rem)]/[1.45] font-semibold tracking-[-0.015em] text-balance text-ru-n-600">
          All of it runs on <span className="text-[#0F8C4C]">WhatsApp</span>, automatically.
        </p>
        <p className="mx-auto mb-7 max-w-[52ch] text-[clamp(1rem,2vw,1.125rem)]/[1.55] text-pretty text-ru-n-500 sm:mb-9">
          No new apps for your customers. No extra work for your team.
        </p>

        {/* One full-width button per row on phones — two centred pills of different widths
            read as ragged, and the WhatsApp label is 24 characters wide. */}
        <div className="mb-5.5 flex flex-wrap justify-center gap-3">
          <BookDemoCta className="max-sm:w-full max-sm:justify-center" />
          <WhatsAppCta className="max-sm:w-full max-sm:justify-center" />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {/* The lockup carries the "Meta" wordmark, so the chip's own label drops it —
              "Meta · Meta Business Partner" would otherwise read twice. */}
          <TrustChip icon={<MetaLockup className="h-6" />}>Business Partner</TrustChip>
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
