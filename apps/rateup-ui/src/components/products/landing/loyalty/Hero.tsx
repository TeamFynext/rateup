import { Link } from "@tanstack/react-router";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";
import { WHATSAPP_HREF } from "@/components/RateupHomePage/shared/home-ui";

import { WhatsAppGlyph } from "./glyphs";
import PhoneMock from "./PhoneMock";

/**
 * Hero.
 *
 * The trust chip reads "100+ businesses" rather than the 500+ in the design's static markup: the
 * design's own saved tweak default is 100+, and that is the figure the rest of the site claims.
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ru-n-100 bg-[linear-gradient(180deg,var(--color-ru-blue-50)_0%,var(--color-background)_62%)] py-[clamp(2.25rem,5vw,4rem)] pb-[clamp(3rem,7vw,5.5rem)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-18%] left-1/2 aspect-2/1 w-[min(1100px,120%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(90,140,198,0.16)_0%,transparent_64%)]"
      />
      <div className="relative z-1 mx-auto max-w-290 px-5">
        <div className="grid grid-cols-1 items-center gap-[clamp(2rem,5vw,3.75rem)] lg:grid-cols-[1.04fr_0.96fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-ru-n-200 bg-white px-3.25 py-1.75 text-[13.5px] font-medium text-ru-n-600">
              <span className="size-4 flex-none rounded-full bg-ru-star" />
              Trusted by 100+ businesses
            </span>

            <h1 className="mt-5.5 font-display text-[clamp(2.375rem,5.4vw,4.125rem)]/[1.05] font-bold tracking-[-0.035em] text-balance text-ru-n-700">
              Loyalty that lives in the chat — on{" "}
              <span className="inline-flex items-center gap-[0.2em] whitespace-nowrap text-[#0F8C4C]">
                <span className="inline-flex size-[0.82em] flex-none items-center justify-center rounded-[0.22em] bg-wa-green">
                  <WhatsAppGlyph className="size-[62%]" />
                </span>
                WhatsApp
              </span>
              .
            </h1>

            <p className="mt-5 mb-[clamp(1.625rem,3.4vw,2.125rem)] max-w-[52ch] text-[clamp(1.0625rem,2vw,1.25rem)]/[1.62] text-pretty text-ru-n-500">
              Points, tiers, referrals and redemptions inside the thread your customers already
              open. No app to download, no card to carry, no login to forget.
            </p>

            <div className="mb-5 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="inline-flex h-13.5 items-center gap-2.25 rounded-lg bg-ru-blue-600 px-7 text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(28,81,142,0.18)] transition-colors hover:bg-ru-blue-700"
              >
                Start WhatsApp Loyalty
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 flex-none"
                  aria-hidden="true"
                >
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </Link>
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-13.5 items-center gap-2.25 rounded-lg border border-ru-n-200 bg-white px-7 text-[17px] font-semibold text-ru-n-700 shadow-xs transition-colors hover:border-ru-n-300"
              >
                <span className="inline-flex size-6 flex-none items-center justify-center rounded-md bg-wa-green">
                  <WhatsAppGlyph className="size-3.5" />
                </span>
                Chat with us on WhatsApp
              </a>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-ru-n-200 bg-white px-3.25 py-1.75 text-[13.5px] font-medium text-ru-n-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.75 text-ru-blue-600"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Meta Business Partner
              </span>
              <Link
                to="/integrations"
                className="inline-flex items-center gap-2 rounded-full border border-ru-n-200 bg-white px-3.25 py-1.75 text-[13.5px] font-medium text-ru-n-600 transition-colors hover:border-ru-n-300"
              >
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
                Works with Shopify &amp; WooCommerce
              </Link>
            </div>

            <p className="sr-only">
              <Link to={BOOK_DEMO_ROUTE}>Book a demo of RateUp WhatsApp loyalty</Link>
            </p>
          </div>

          <PhoneMock />
        </div>
      </div>
    </section>
  );
}
