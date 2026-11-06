import { Link } from "@tanstack/react-router";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";

import Capabilities from "./Capabilities";
import Comparison from "./Comparison";
import Faq from "./Faq";
import Hero from "./Hero";
import Pricing from "./Pricing";
import Setup from "./Setup";
import Stats from "./Stats";
import UseCases from "./UseCases";

/**
 * `/products/whatsapp-business-api`.
 *
 * A direct implementation of the "WhatsApp Business API" design. As with the broadcast page, the
 * design's NavBar and Footer imports stand in for the site chrome `Layout` already supplies, and
 * everything is drawn with the `ru-*` Tailwind palette rather than the design's raw CSS
 * variables — the two are the same design system.
 *
 * The one systematic departure: the design's canvas is desktop-only and uses fixed
 * `repeat(3,1fr)` / `minmax(0,7fr) minmax(0,5fr)` grids. Those are expressed here as responsive
 * Tailwind grids that stack, since the real page has to survive a phone.
 */

/** The navy sign-off, in the design's 7fr/5fr split. */
function ClosingBand() {
  return (
    <section className="border-t border-ru-n-100 bg-ru-blue-900">
      <div className="mx-auto grid max-w-280 grid-cols-1 items-center gap-10 px-5 py-[clamp(3rem,7vw,5.5rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <span className="text-[11.5px] font-semibold tracking-[0.1em] text-white/60 uppercase">
            Ready when you are
          </span>
          <h2 className="mt-3 mb-3.5 font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-balance text-white">
            Get your WhatsApp Business API today.
          </h2>
          <p className="max-w-[52ch] text-[16.5px]/[1.6] text-white/72">
            Connect through Embedded Signup, submit your first template, and let every reply land in
            one inbox. Automate it with RateUp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 lg:justify-end">
          <Link
            to="/pricing"
            className="inline-flex h-10 items-center rounded-full bg-ru-star-cta px-5.5 text-sm font-semibold text-ru-blue-900 transition-[filter] hover:brightness-[0.97]"
          >
            Get Started Free
          </Link>
          <Link
            to={BOOK_DEMO_ROUTE}
            className="inline-flex h-10 items-center rounded-lg border border-white/18 px-5.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Book a Demo
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function BusinessApiPage() {
  return (
    <>
      <Hero />
      <Comparison />
      <Setup />
      <Stats />
      <Capabilities />
      <UseCases />
      <Pricing />
      <Faq />
      <ClosingBand />
    </>
  );
}
