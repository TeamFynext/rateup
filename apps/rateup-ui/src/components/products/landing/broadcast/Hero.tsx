import { Link } from "@tanstack/react-router";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";
import { CheckIcon } from "@/components/RateupHomePage/shared/home-ui";
import { imagesPath } from "@/utils/constants";

import PhoneMock from "./PhoneMock";

/**
 * Hero and the trust band beneath it.
 *
 * The band's copy and figures are the ones `TrustedBy` already claims on the homepage; the
 * design draws it as a plain six-tile row rather than the homepage's marquee, so the tiles are
 * static here and carry the real client marks instead of the comp's grey placeholders.
 */

const PROOF = [
  "Verified business name",
  "Delivery receipts per message",
  "Plans start free",
] as const;

const CLIENT_LOGOS = Array.from(
  { length: 6 },
  (_, i) => `${imagesPath}/homepage/CLIENTS/${i + 1}.png`,
);

export default function Hero() {
  return (
    <>
      <section className="border-b border-ru-n-100 bg-ru-n-50 pt-[clamp(2.5rem,5.5vw,4.5rem)] pb-[clamp(3rem,6vw,5rem)]">
        <div className="mx-auto grid max-w-280 grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-center gap-14 px-5">
          <div className="flex flex-col items-start gap-5.5">
            <span className="inline-flex h-5 items-center gap-1 rounded-4xl border border-ru-blue-200 bg-ru-blue-50 px-2 text-xs font-medium tracking-[-0.005em] text-ru-blue-600">
              <span className="size-1.5 flex-none rounded-full bg-current" />
              Official WhatsApp Business API
            </span>

            <h1 className="max-w-[15ch] font-display text-[clamp(2rem,5vw,3rem)]/[1.06] font-bold tracking-[-0.03em] text-pretty text-ru-n-700">
              WhatsApp broadcast software that reaches everyone, without the ban risk
            </h1>

            <p className="max-w-[56ch] text-[18px]/[1.6] text-pretty text-ru-n-500">
              Send broadcasts from your own verified number, to an unlimited number of contacts,
              using Meta-approved templates. Built on the{" "}
              <Link
                to="/products/whatsapp-business-api"
                className="font-medium text-ru-blue-600 underline underline-offset-2 hover:text-ru-blue-700"
              >
                WhatsApp Business API
              </Link>{" "}
              — no broadcast lists, no unofficial senders.
            </p>

            <div className="flex flex-wrap gap-3 pt-0.5">
              {/* The star gradient is the design's one "primary" CTA treatment; navy text on it,
                  never white — see `--ru-on-star`. */}
              <Link
                to="/signup"
                className="inline-flex h-10 items-center rounded-full bg-ru-star-cta px-5.5 text-sm font-semibold text-ru-blue-900 shadow-xs transition-[filter] hover:brightness-[0.97]"
              >
                Start Free
              </Link>
              <Link
                to={BOOK_DEMO_ROUTE}
                className="inline-flex h-10 items-center rounded-lg border border-ru-n-200 bg-white px-5.5 text-sm font-semibold text-ru-n-700 shadow-xs transition-colors hover:border-ru-n-300"
              >
                Book a Demo
              </Link>
            </div>

            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ru-n-400">
              {PROOF.map((point) => (
                <li key={point} className="flex items-center gap-1.5">
                  <CheckIcon className="size-3.5 text-ru-green-500" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <PhoneMock />
        </div>
      </section>

      <section className="border-b border-ru-n-100 bg-background pt-7 pb-10">
        <div className="mx-auto flex max-w-280 flex-col items-center gap-5.5 px-5">
          <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-n-400 uppercase">
            Trusted by 100+ ecommerce brands across 30+ countries
          </span>
          <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4">
            {CLIENT_LOGOS.map((logo) => (
              <span
                key={logo}
                className="flex h-11 items-center justify-center rounded-lg bg-white opacity-70 ring-1 ring-ru-n-200 ring-inset"
              >
                <img
                  src={logo}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-6 w-auto object-contain grayscale"
                />
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
