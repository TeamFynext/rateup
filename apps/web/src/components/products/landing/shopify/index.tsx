import { Link } from "@tanstack/react-router";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";

import { CASE_STUDIES, SHOPIFY_APP_STORE_URL } from "./content";
import Faq from "./Faq";
import Hero from "./Hero";
import Journeys from "./Journeys";
import { Badge, Card, CardTitle, H2 } from "./sections";
import { Events, Setup, Stats } from "./Setup";

/**
 * `/integrations/shopify`.
 *
 * An implementation of the "Shopify Integration" design. As with the other imports from this
 * design system, the NavBar and Footer it draws are stand-ins for the site chrome `Layout`
 * supplies, and everything is expressed in the `ru-*` Tailwind palette rather than the design's
 * raw CSS variables.
 *
 * Two things from the canvas are not carried over: the lucide CDN script (its glyphs are inlined
 * instead, so the page adds no third-party request), and the India/UAE/Singapore `region` prop —
 * a canvas control whose default, India, is the only value a visitor would ever see.
 */

/** "Sell on WhatsApp, fulfil on Shopify". */
function Commerce() {
  const modes = [
    {
      title: "Shopify checkout link",
      body: "The cart becomes a checkout link sent straight into the thread.",
      icon: (
        <>
          <path d="M9 17H7A5 5 0 0 1 7 7h2" />
          <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
          <path d="M8 12h8" />
        </>
      ),
    },
    {
      title: "WhatsApp native payment",
      body: "Payment is taken in WhatsApp and the order is synced to Shopify.",
      icon: (
        <>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </>
      ),
    },
  ];

  return (
    <section className="border-y border-ru-n-100 bg-ru-n-50 px-5 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto grid max-w-280 grid-cols-1 items-center gap-[clamp(1.5rem,4vw,3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col gap-3.5">
          <H2>Sell on WhatsApp, fulfil on Shopify</H2>
          <p className="max-w-[66ch] text-base/[1.6] text-ru-n-500">
            When a customer builds a cart from your WhatsApp catalog, RateUp can auto-send a Shopify
            checkout link, or take WhatsApp native payment and sync the order back to Shopify.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {modes.map((mode) => (
            <Card key={mode.title}>
              <span className="inline-flex size-10 items-center justify-center rounded-md border border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                  aria-hidden="true"
                >
                  {mode.icon}
                </svg>
              </span>
              <h3 className="mt-3.5 mb-1.5">
                <CardTitle>{mode.title}</CardTitle>
              </h3>
              <p className="text-[13.5px]/[1.5] text-ru-n-500">{mode.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The cash-on-delivery callout. */
function CodCallout() {
  return (
    <section className="px-5 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto max-w-280">
        <div className="grid grid-cols-1 items-center gap-[clamp(1.25rem,3vw,2.5rem)] rounded-2xl border border-white/8 bg-ru-blue-900 p-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex flex-col items-start gap-3.5">
            <Badge tone="warm">India specific</Badge>
            <h2 className="font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-white">
              Confirm cash-on-delivery orders before you ship
            </h2>
            <p className="max-w-[66ch] text-base/[1.6] text-white/72">
              Use the Orders create event with a quick-reply template — &ldquo;Confirm order&rdquo;
              or &ldquo;Cancel&rdquo; — so a courier never leaves with an order the customer has
              already changed their mind about. Fewer refused deliveries, less return-to-origin.
            </p>
            <Link
              to="/tools/rto-loss-calculator"
              className="inline-flex h-10 items-center rounded-lg bg-white px-5.5 text-sm font-semibold text-ru-blue-700 transition-transform hover:-translate-y-px"
            >
              Calculate your RTO losses
            </Link>
          </div>

          <div className="flex min-w-60 flex-col gap-2.5 rounded-2xl border border-white/8 bg-white/5 p-4.5">
            <span className="text-xs tracking-[0.06em] text-white/42 uppercase">Orders create</span>
            <p className="text-sm/[1.5] text-white">
              Hi Asha, please confirm your COD order #1042 so we can pack it today.
            </p>
            <div className="mt-1 flex gap-2">
              {["Confirm order", "Cancel"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/18 bg-white/8 px-3 py-1.5 text-[12.5px] font-medium text-white"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The plans strip. */
function Plans() {
  return (
    <section className="px-5 pb-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-wrap items-center justify-between gap-5 rounded-xl bg-white px-7 py-6 shadow-xs ring-1 ring-ru-n-200 ring-inset">
        <div className="flex flex-col gap-1.5">
          <span className="font-display text-lg font-bold tracking-[-0.02em] text-ru-n-700">
            Start on the free plan
          </span>
          <span className="text-sm text-ru-n-500">
            Free on the Shopify App Store. Paid tiers: Essential, Plus, Pro.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {["Essential", "Plus", "Pro"].map((tier) => (
            <Badge key={tier}>{tier}</Badge>
          ))}
          <Link
            to="/pricing"
            className="inline-flex h-9 items-center rounded-lg border border-ru-n-200 bg-white px-4 text-sm font-semibold text-ru-n-700 transition-colors hover:border-ru-n-300"
          >
            Compare plans
          </Link>
        </div>
      </div>
    </section>
  );
}

/** The retail proof band. */
function CaseStudies() {
  return (
    <section className="bg-ru-blue-900 px-5 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-col gap-7">
        <div className="flex flex-col gap-2.5">
          <span className="text-[11.5px] font-semibold tracking-[0.1em] text-white/42 uppercase">
            Retail proof
          </span>
          <h2 className="font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-white">
            Retailers already running this on WhatsApp
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
          {CASE_STUDIES.map((study) => (
            <div
              key={study.brand}
              className="flex flex-col gap-3.5 rounded-2xl border border-white/8 bg-white/5 p-8"
            >
              <span className="font-display text-base font-medium text-white">{study.brand}</span>
              <span className="font-display text-[38px]/none font-bold tracking-[-0.03em] tabular-nums text-ru-amber-300">
                {study.figure}
              </span>
              <p className="text-[14.5px]/[1.55] text-white/72">{study.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The closing call to action. */
function ClosingBand() {
  return (
    <section className="px-5 pb-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-wrap items-center justify-between gap-6 rounded-2xl bg-ru-blue-600 p-[clamp(2rem,4vw,3rem)]">
        <h2 className="max-w-[22ch] font-display text-[clamp(1.5rem,3vw,2rem)]/[1.15] font-bold tracking-[-0.028em] text-white">
          Install RateUp on your Shopify store.
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={SHOPIFY_APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-lg bg-white px-5.5 text-sm font-semibold text-ru-blue-700 shadow-xs transition-transform hover:-translate-y-px"
          >
            Install from Shopify App Store
          </a>
          <Link
            to={BOOK_DEMO_ROUTE}
            className="inline-flex h-10 items-center rounded-lg border border-white/35 px-5.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Book a Demo
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function ShopifyIntegrationPage() {
  return (
    <>
      <Hero />
      <Setup />
      <Events />
      <Stats />
      <Journeys />
      <Commerce />
      <CodCallout />
      <Plans />
      <CaseStudies />
      <Faq />
      <ClosingBand />
    </>
  );
}
