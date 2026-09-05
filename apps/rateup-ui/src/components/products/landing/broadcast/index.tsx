import { Link } from "@tanstack/react-router";

import { RateupStar } from "@/components/integrations/logos";
import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";

import CampaignTabs from "./CampaignTabs";
import Faq from "./Faq";
import Hero from "./Hero";
import Problem from "./Problem";
import Stats from "./Stats";
import UseCases from "./UseCases";

/**
 * `/products/whatsapp-broadcast`.
 *
 * A direct implementation of the "WhatsApp Broadcast Landing" design. The design's own NavBar and
 * Footer imports are stand-ins for the site chrome, which `Layout` already supplies, so the page
 * starts at the hero and ends at the closing band.
 *
 * Everything here is drawn with the `ru-*` Tailwind palette rather than the design's raw CSS
 * variables: the two are the same design system — `tokens/colors.css` and the repo's
 * `styles/foundation.css` carry byte-identical ramps, and the radius scale matches step for step.
 */

/** Meta bills per delivered message; the software does not. */
function PricingBand() {
  return (
    <section className="py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto max-w-280 px-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-center gap-10 rounded-2xl bg-ru-blue-50 px-9 py-8 shadow-xs ring-1 ring-ru-blue-200 ring-inset">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-[22px]/[1.25] font-bold tracking-[-0.018em] text-ru-n-700">
              You pay Meta for what is delivered, and nothing for the software to start.
            </h2>
            <p className="max-w-[66ch] text-base/[1.6] text-ru-n-500">
              Meta charges per delivered template by category and country, so a marketing broadcast
              in India costs a different rate than one in the UAE. RateUp plans start free, and you
              can move up when your volume does.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              to="/tools/whatsapp-pricing-calculator"
              className="inline-flex h-10 items-center rounded-lg bg-ru-blue-600 px-5.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(28,81,142,0.2)] transition-colors hover:bg-ru-blue-700"
            >
              Estimate your cost
            </Link>
            <Link
              to="/pricing"
              className="inline-flex h-10 items-center rounded-lg border border-ru-n-200 bg-white px-5.5 text-sm font-semibold text-ru-n-700 shadow-xs transition-colors hover:border-ru-n-300"
            >
              See plans
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The navy sign-off. Its primary CTA inverts to white-on-navy, as the design specifies. */
function ClosingBand() {
  return (
    <section className="bg-ru-blue-900">
      <div className="mx-auto flex max-w-280 flex-col items-center gap-5.5 px-5 py-[clamp(3rem,6vw,5rem)] text-center">
        <RateupStar
          priority={false}
          className="size-10 animate-ru-pulse motion-reduce:animate-none"
        />
        <h2 className="font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-white">
          Send your first broadcast today.
        </h2>
        <p className="max-w-[46ch] text-[18px]/[1.55] text-pretty text-white/72">
          Connect your number, pick an approved template, and reach your whole list this afternoon.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <Link
            to="/signup"
            className="inline-flex h-10 items-center rounded-lg bg-white px-5.5 text-sm font-semibold text-ru-blue-900 transition-transform hover:-translate-y-px"
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

export default function BroadcastPage() {
  return (
    <>
      <Hero />
      <Problem />
      <Stats />
      <CampaignTabs />
      <UseCases />
      <PricingBand />
      <Faq />
      <ClosingBand />
    </>
  );
}
