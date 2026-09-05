import { Link } from "@tanstack/react-router";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";
import { WHATSAPP_HREF } from "@/components/RateupHomePage/shared/home-ui";

import Faq from "./Faq";
import { WhatsAppGlyph } from "./glyphs";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import Integrations from "./Integrations";
import ProfilePanel from "./ProfilePanel";
import Trusted from "./Trusted";

/**
 * `/products/whatsapp-loyalty`.
 *
 * An implementation of the "RateUp Loyalty Landing Page" design. Its nav and footer are the site
 * chrome `Layout` already supplies, so the page runs hero → closing band.
 *
 * Two things in the design are deliberately not carried over: the `#tweaks` panel, which is the
 * design tool's own editing scaffolding rather than page content, and the accent override its
 * saved tweak state carries (blue-700). The site's accent is blue-600 everywhere else and one
 * page quietly differing would read as a mistake.
 */
function ClosingBand() {
  return (
    <section className="relative overflow-hidden bg-ru-blue-950 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-14%] left-1/2 aspect-2/1 w-[min(1000px,120%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(90,140,198,0.2)_0%,transparent_62%)]"
      />
      <div className="relative mx-auto max-w-290 px-5">
        <div className="mx-auto max-w-190 pt-[clamp(3.5rem,8vw,6.5rem)] pb-[clamp(2.5rem,5vw,4rem)] text-center">
          <span className="mb-6 inline-flex items-center gap-2.25 rounded-full border border-white/14 bg-white/5 py-1.25 pr-3.5 pl-1.25 text-[13.5px] font-medium text-white/76">
            <span className="size-4.5 flex-none rounded-full bg-ru-star" />
            Set up on your own WhatsApp number in 20 minutes
          </span>
          <h2 className="mb-4.5 font-display text-[clamp(2.125rem,5.4vw,3.75rem)]/[1.05] font-bold tracking-[-0.035em] text-balance text-white">
            Ready to turn one sale into a lifetime?
          </h2>
          <p className="mx-auto mb-[clamp(1.75rem,4vw,2.25rem)] max-w-[52ch] text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-white/68">
            Book a 20-minute demo, or message us on WhatsApp — the same channel your customers will
            be using.
          </p>
          <div className="mb-4 flex flex-wrap justify-center gap-3">
            <Link
              to={BOOK_DEMO_ROUTE}
              className="inline-flex h-13.5 items-center gap-2.25 rounded-lg bg-white px-7 text-[17px] font-semibold text-ru-blue-700 transition-transform hover:-translate-y-px hover:text-ru-blue-800 max-sm:w-full max-sm:justify-center"
            >
              Book a Demo
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
              className="inline-flex h-13.5 items-center gap-2.25 rounded-lg border border-white/22 bg-white/6 px-7 text-[17px] font-semibold text-white transition-colors hover:bg-white/12 max-sm:w-full max-sm:justify-center"
            >
              <span className="inline-flex size-6 flex-none items-center justify-center rounded-md bg-wa-green">
                <WhatsAppGlyph className="size-3.5" />
              </span>
              Chat with us on WhatsApp
            </a>
          </div>
          <div className="text-sm text-white/50">No credit card required · Cancel anytime</div>
        </div>
      </div>
    </section>
  );
}

export default function LoyaltyPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <ProfilePanel />
      <Integrations />
      <Trusted />
      <Faq />
      <ClosingBand />
    </>
  );
}
