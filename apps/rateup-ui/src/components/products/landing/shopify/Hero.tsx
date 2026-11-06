import { Link } from "@tanstack/react-router";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";

import { SHOPIFY_APP_STORE_URL } from "./content";
import PhoneMock from "./PhoneMock";
import { Badge } from "./sections";

export default function Hero() {
  return (
    <section className="px-5 pt-[clamp(2.5rem,5vw,4rem)] pb-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto grid max-w-280 grid-cols-1 items-center gap-[clamp(2rem,4vw,3.5rem)] lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
        <div className="flex flex-col items-start gap-5.5">
          <Badge tone="accent">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3"
              aria-hidden="true"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Available on the Shopify App Store
          </Badge>

          <h1 className="font-display text-[clamp(2rem,5vw,3rem)]/[1.06] font-bold tracking-[-0.03em] text-pretty text-ru-n-700">
            The Shopify WhatsApp integration that runs your post-purchase journey
          </h1>

          <p className="max-w-[56ch] text-[18px]/[1.6] text-pretty text-ru-n-500">
            Order updates, abandoned-checkout recovery, feedback requests and loyalty points,
            triggered by your store's events, delivered on WhatsApp.
          </p>

          <div className="flex flex-wrap gap-3 pt-0.5">
            <a
              href={SHOPIFY_APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-full bg-ru-star-cta px-5.5 text-sm font-semibold text-ru-blue-900 shadow-xs transition-[filter] hover:brightness-[0.97]"
            >
              Install from Shopify Store
            </a>
            <Link
              to={BOOK_DEMO_ROUTE}
              className="inline-flex h-10 items-center rounded-lg border border-ru-n-200 bg-white px-5.5 text-sm font-semibold text-ru-n-700 shadow-xs transition-colors hover:border-ru-n-300"
            >
              Book a Demo
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Badge tone="outline">Free plan</Badge>
            <Badge tone="outline">Official WhatsApp Business API</Badge>
            <Badge tone="outline">Webhooks set up for you</Badge>
          </div>
        </div>

        <PhoneMock />
      </div>
    </section>
  );
}
