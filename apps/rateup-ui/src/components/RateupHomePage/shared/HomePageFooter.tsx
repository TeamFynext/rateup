import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import type { ReactNode } from "react";

import { rateupLogoWhite } from "@/utils/constants";

/**
 * The marketing footer, as drawn in the design.
 *
 * The comp nests this inside the navy closing-CTA block; here it is a separate component
 * (it is `Layout`'s default footer for every marketing page), so it carries its own navy
 * ground and the hairline that separates it from whatever sits above.
 *
 * The comp's link columns are plain text; these are real links, and the four labels it lists
 * that have no page behind them (Careers, DPA, Security, plus a "Case studies" page) resolve
 * to the closest real destination rather than to a dead route.
 */

/** rgba(255,255,255,.08) in the comp — the hairline that divides the navy stack. */
const HAIRLINE = "border-white/8";

function FooterCol({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div className="min-w-0">
      <h3 className="mb-3.5 text-[12.5px] font-semibold tracking-widest text-white/42 uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

const LINK = "text-[15px] text-white/72 transition-colors hover:text-white";

export default function HomePageFooter() {
  return (
    <footer className={`relative border-t bg-ru-blue-950 ${HAIRLINE}`}>
      <div className="mx-auto max-w-280 px-5 pt-9 pb-6 sm:pt-14 sm:pb-8">
        {/* Six tracks at `lg`: the brand cell takes two and each of the four link columns takes
            one, so they share a single row. The comp's `auto-fit` only ever resolved to five
            tracks here — it was drawn with three link columns, not four — which pushed Legal
            onto a row of its own. */}
        <div
          className={`grid grid-cols-2 gap-8 border-b pb-8 md:grid-cols-4 lg:grid-cols-6 ${HAIRLINE}`}
        >
          <div className="col-span-2 min-w-0 md:col-span-4 lg:col-span-2">
            <p className="max-w-[34ch] text-[15px]/[1.6] text-white/62">
              Loyalty, feedback and referrals on the channel your customers already open.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/5 px-3 py-1.75">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-ru-blue-400)"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.75"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span className="text-[13.5px] font-medium text-white/78">Meta Business Partner</span>
            </div>
          </div>

          <FooterCol title="Platform">
            <Link to="/products/whatsapp-loyalty" className={LINK}>
              WhatsApp Loyalty
            </Link>
            <Link to="/products/omnichannel-inbox" className={LINK}>
              Omnichannel Inbox
            </Link>
            <Link to="/products/whatsapp-feedback" className={LINK}>
              WhatsApp Feedback
            </Link>
            <a href="/#platform" className={LINK}>
              Campaigns
            </a>
          </FooterCol>

          <FooterCol title="Company">
            <Link to="/about-us" className={LINK}>
              About
            </Link>
            <a href="/#results" className={LINK}>
              Case studies
            </a>
            <Link to="/pricing" className={LINK}>
              Pricing
            </Link>
            <Link to="/contact-us" className={LINK}>
              Contact
            </Link>
          </FooterCol>

          <FooterCol title="Resources">
            <Link to="/blog" className={LINK}>
              Blog
            </Link>
            <a
              href="https://docs.rateup.app"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              Help Center
            </a>
            <Link to="/tools" className={LINK}>
              Free tools
            </Link>
            <a href="/#integrations" className={LINK}>
              Integrations
            </a>
          </FooterCol>

          <FooterCol title="Legal">
            <Link to="/privacy-policy" className={LINK}>
              Privacy
            </Link>
            <Link to="/terms-of-service" className={LINK}>
              Terms
            </Link>
          </FooterCol>
        </div>

        {/* The comp signs off with the lockup set the full width of the footer. Its own asset
            is 2.61:1 and ours is 2.52:1, so this lands at the same ~385px the comp draws. */}
        <div className="py-2.5 sm:pt-4.5 sm:pb-1.5">
          <Link to="/" aria-label="RateUp home" className="block">
            <Image
              src={rateupLogoWhite}
              alt="RateUp"
              width={1000}
              height={397}
              loading="lazy"
              decoding="async"
              className="mx-auto block h-auto w-full max-w-250 opacity-90"
            />
          </Link>
        </div>

        <div
          className={`flex flex-wrap items-center justify-between gap-3.5 border-t pt-5.5 ${HAIRLINE}`}
        >
          <span className="text-[13.5px] text-white/42">
            © {new Date().getFullYear()} RateUp. All rights reserved.
          </span>
          <span className="text-[13px] tracking-[0.08em] text-white/42">www.rateup.app</span>
        </div>
      </div>
    </footer>
  );
}
