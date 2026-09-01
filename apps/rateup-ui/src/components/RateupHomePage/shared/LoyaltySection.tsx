import { Link } from "@tanstack/react-router";

import { BOOK_DEMO_ROUTE } from "../helper/BookDemoLink";
import { ArrowRight, WhatsAppTile, WHATSAPP_HREF } from "./home-ui";

/**
 * The closing band. This is the one place on the homepage that goes navy, so the CTA reads
 * as the end of the page rather than another section — the shared footer picks up below it.
 */
export default function LoyaltySection() {
  return (
    <section id="demo" className="relative overflow-hidden bg-ru-blue-950">
      <div className="absolute top-[-14%] left-1/2 aspect-2/1 w-[min(1000px,120%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(90,140,198,0.2)_0%,transparent_62%)]" />

      <div className="relative mx-auto max-w-280 px-5 py-14 sm:py-26">
        <div className="mx-auto max-w-190 text-center">
          <div className="mb-6 inline-flex items-center gap-2.25 rounded-full border border-white/14 bg-white/5 py-1.25 pr-3.5 pl-1.25">
            <span className="size-4.5 flex-none rounded-full bg-ru-star" />
            <span className="text-[13.5px] font-medium text-white/76">
              Set up on your own WhatsApp number in 20 minutes
            </span>
          </div>

          <h2 className="mb-4.5 font-display text-[clamp(2.125rem,5.4vw,3.75rem)]/[1.05] font-bold tracking-[-0.035em] text-balance text-white">
            Ready to turn one sale into a lifetime?
          </h2>
          <p className="mx-auto mb-7 max-w-[52ch] text-[clamp(1.0625rem,2.1vw,1.28125rem)]/[1.6] text-pretty text-white/68 sm:mb-9">
            Book a 20-minute demo, or message us on WhatsApp — the same channel your customers will
            be using.
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

          <div className="text-sm text-white/50">No credit card required · Cancel anytime</div>
        </div>
      </div>
    </section>
  );
}
