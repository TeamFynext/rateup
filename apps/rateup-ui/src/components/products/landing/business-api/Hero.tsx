import { Link } from "@tanstack/react-router";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";
import { CheckIcon } from "@/components/RateupHomePage/shared/home-ui";

import PhoneMock from "./PhoneMock";

const PROOF = ["Free plan, no card", "Three required steps", "Keep your number"] as const;

export default function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-280 grid-cols-1 items-center gap-13 px-5 pt-[clamp(3rem,6vw,5.5rem)] pb-[clamp(2.75rem,5vw,4.5rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2.25 rounded-full border border-ru-n-200 bg-white py-1.25 pr-3.5 pl-1.5 shadow-xs">
            <span className="inline-flex h-5.5 items-center rounded-full bg-ru-blue-50 px-2.25 font-display text-xs font-bold tracking-[-0.01em] text-ru-blue-600">
              Meta
            </span>
            <span className="text-[12.5px] font-medium text-ru-n-500">
              Business Partner · Embedded Signup
            </span>
          </div>

          <h1 className="mb-5 font-display text-[clamp(2.5rem,7vw,4.5rem)]/[1.02] font-bold tracking-[-0.037em] text-balance text-ru-n-700">
            WhatsApp Business API, live on your number in minutes
          </h1>

          <p className="mb-7.5 max-w-[56ch] text-[18px]/[1.6] text-pretty text-ru-n-500">
            Connect through Meta's Embedded Signup, get templates approved, and run loyalty,
            feedback and broadcasts from one inbox.
          </p>

          <div className="mb-6.5 flex flex-wrap gap-2.5">
            <Link
              to="/pricing"
              className="inline-flex h-10 items-center rounded-full bg-ru-star-cta px-5.5 text-sm font-semibold text-ru-blue-900 shadow-xs transition-[filter] hover:brightness-[0.97]"
            >
              Get Started Free
            </Link>
            <Link
              to={BOOK_DEMO_ROUTE}
              className="inline-flex h-10 items-center rounded-lg bg-ru-n-100 px-5.5 text-sm font-semibold text-ru-n-700 transition-colors hover:bg-ru-n-200"
            >
              Book a Demo
            </Link>
          </div>

          <ul className="flex flex-wrap gap-x-5.5 gap-y-2">
            {PROOF.map((point) => (
              <li key={point} className="flex items-center gap-1.75 text-[13.5px] text-ru-n-500">
                <CheckIcon className="size-3.75 text-ru-green-500" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <PhoneMock />
      </div>
    </section>
  );
}
