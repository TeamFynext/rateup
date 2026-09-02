import { Link } from "@tanstack/react-router";

import { imagesPath } from "@/utils/constants";

import { BOOK_DEMO_ROUTE } from "../helper/BookDemoLink";
import { Eyebrow } from "./home-ui";

const INTEGRATIONS = [
  { name: "Shopify", role: "Orders & customers", logo: `${imagesPath}/landing/logos/shopyfy.png` },
  { name: "WooCommerce", role: "Orders & customers", logo: `${imagesPath}/landing/logos/woo.png` },
  { name: "Petpooja", role: "POS & billing", logo: `${imagesPath}/landing/logos/petlogo.png` },
  { name: "Zoho", role: "CRM sync", logo: `${imagesPath}/landing/logos/zoho.png` },
  { name: "Zapier", role: "3,000+ apps", logo: `${imagesPath}/landing/logos/zapier.png` },
  { name: "REST API", role: "Build your own", logo: null },
];

/* One tile is raised at a time. The delay is `index x stride`, and the stride is the 6.3s
   cycle in `--animate-ru-card-lift` divided by the number of tiles (the six integrations plus
   the "30+ more" card), so the wave hands off cleanly and restarts without a gap. */
const CARD_COUNT = INTEGRATIONS.length + 1;
const LIFT_STRIDE_MS = 6300 / CARD_COUNT;
const liftDelay = (index: number) => ({
  animationDelay: `${Math.round(index * LIFT_STRIDE_MS)}ms`,
});

export default function Integrations() {
  return (
    <section id="integrations" className="border-b border-ru-n-100 bg-ru-n-50">
      <div className="mx-auto max-w-280 px-5 py-12 sm:py-22">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-5 sm:mb-8">
          <div className="max-w-140">
            <Eyebrow
              className="mb-4.5"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                  aria-hidden="true"
                >
                  <path d="M9 3v5" />
                  <path d="M15 3v5" />
                  <path d="M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z" />
                  <path d="M12 17v4" />
                </svg>
              }
            >
              Integrations
            </Eyebrow>
            <h2 className="font-display text-[clamp(1.6875rem,3.8vw,2.375rem)]/[1.12] font-bold tracking-[-0.028em] text-ru-n-700">
              Plug RateUp into your stack.
            </h2>
          </div>
          <p className="max-w-[38ch] text-[15.5px] text-ru-n-500">
            Orders, customers and points sync both ways. Most setups are live the same day.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {INTEGRATIONS.map((intg, i) => (
            <div
              key={intg.name}
              style={liftDelay(i)}
              className="flex h-24 min-w-0 animate-ru-card-lift items-center gap-3.5 rounded-2xl border border-ru-n-200 bg-white px-4.5 transition-colors hover:border-ru-n-300 motion-reduce:animate-none"
            >
              {/* Full colour: the comp greyed these tiles out only because it was showing
                  monogram placeholders, not the partners' real marks. */}
              <span className="flex size-11 flex-none items-center justify-center rounded-xl border border-ru-n-200 bg-ru-n-50">
                {intg.logo ? (
                  <img src={intg.logo} alt="" className="size-7.5 object-contain" />
                ) : (
                  <span className="font-mono text-sm font-bold text-ru-n-500">{"{ }"}</span>
                )}
              </span>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-ru-n-700">{intg.name}</div>
                <div className="truncate text-[13.5px] text-ru-n-400">{intg.role}</div>
              </div>
            </div>
          ))}

          <Link
            to={BOOK_DEMO_ROUTE}
            style={liftDelay(INTEGRATIONS.length)}
            className="flex h-24 min-w-0 animate-ru-card-lift flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ru-n-300 px-4.5 text-center transition-colors hover:border-ru-blue-600 motion-reduce:animate-none"
          >
            <span className="text-[15.5px] font-semibold text-ru-n-600">30+ more via webhooks</span>
            <span className="text-[13.5px] text-ru-n-400">Ask us about yours</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
