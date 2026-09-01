import type { ReactNode } from "react";

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
        <MessengerMark className="size-[62%]" />
      </span>
    ),
  },
];

/* The cycle closes by repeating the first channel, so -75% lands back on WhatsApp. */
const CHANNEL_CELLS = [...CHANNELS, CHANNELS[0]];

function TrustChip({ icon, children }: Readonly<{ icon: ReactNode; children: ReactNode }>) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ru-n-200 bg-white px-3.5 py-1.75">
      {icon}
      <span className="text-[13.5px] font-medium text-ru-n-600">{children}</span>
    </span>
  );
}

export default function HeroSectionNew() {
  return (
    <section className="border-b border-ru-n-100 bg-ink-25 px-5 pt-11 pb-6 sm:pt-16 sm:pb-9">
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
        <p className="mx-auto mb-7 max-w-[60ch] text-[clamp(1.09375rem,2.2vw,1.3125rem)]/[1.62] text-pretty text-ru-n-500 sm:mb-9">
          Loyalty programs, referral automation, and post-purchase feedback — all running on
          WhatsApp, automatically. No new apps for your customers. No extra work for your team.
        </p>

        {/* One full-width button per row on phones — two centred pills of different widths
            read as ragged, and the WhatsApp label is 24 characters wide. */}
        <div className="mb-5.5 flex flex-wrap justify-center gap-3">
          <BookDemoCta className="max-sm:w-full max-sm:justify-center" />
          <WhatsAppCta className="max-sm:w-full max-sm:justify-center" />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <TrustChip
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.75 text-ru-blue-600"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            }
          >
            Meta Business Partner
          </TrustChip>
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
