import { Link } from "@tanstack/react-router";

import { ArrowRight, ClosingCta } from "@/components/RateupHomePage/shared/home-ui";
import { INTEGRATIONS, integrationPath } from "@/config/integrations";

import { Band, LandingHero, RelatedLinks } from "./sections";

/**
 * `/integrations` — the hub for the integration cluster.
 *
 * Cards come from `src/config/integrations.ts`. Only entries with `page: true` render as links,
 * so the hub can list an integration we support before its landing page exists without shipping
 * a link to a 404.
 */

const PlugIcon = (
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
    <path d="M9 3v5M15 3v5" />
    <path d="M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z" />
    <path d="M12 17v4" />
  </svg>
);

const RELATED = [
  {
    to: "/products/whatsapp-loyalty",
    label: "WhatsApp Loyalty",
    body: "Points awarded from the orders your store already records.",
  },
  {
    to: "/products/whatsapp-broadcast",
    label: "WhatsApp Broadcast",
    body: "Campaigns segmented by what customers actually bought.",
  },
  {
    to: "/products/whatsapp-feedback",
    label: "WhatsApp Feedback",
    body: "Post-purchase surveys triggered by order status.",
  },
] as const;

export default function IntegrationsPage() {
  return (
    <>
      <LandingHero
        eyebrow="Integrations"
        eyebrowIcon={PlugIcon}
        title="Plug RateUp into the stack you already run"
        points={["Two-way sync", "Live the same day", "REST API and webhooks"]}
      >
        Orders, customers and loyalty points move both ways between RateUp and your store, POS and
        CRM — so campaigns are segmented by what people actually bought and points post without
        anyone typing them in.
      </LandingHero>

      <Band
        eyebrow="Connectors"
        eyebrowIcon={PlugIcon}
        title="Native connectors for the systems most of our customers run."
        lead="Everything else connects through Zapier, outbound webhooks or the REST API."
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
          {INTEGRATIONS.map((integration) => {
            const inner = (
              <>
                <div className="flex items-center gap-3.5">
                  <span className="flex size-11 flex-none items-center justify-center rounded-xl border border-ru-n-200 bg-ru-n-50">
                    {integration.logo ? (
                      <img
                        src={integration.logo}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-7.5 object-contain"
                      />
                    ) : (
                      <span className="font-mono text-sm font-bold text-ru-n-500">{"{ }"}</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-[18.5px] font-bold tracking-[-0.02em] text-ru-n-700">
                      {integration.name}
                    </h3>
                    <div className="text-[13.5px] text-ru-n-400">{integration.role}</div>
                  </div>
                </div>
                <p className="text-[15px]/[1.55] text-ru-n-500">{integration.description}</p>
                {integration.page && (
                  <span className="mt-auto inline-flex items-center gap-1.5 text-[15px] font-semibold text-ru-blue-600">
                    See the integration
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </>
            );

            const shell =
              "group flex h-full flex-col gap-3.5 rounded-[20px] border border-ru-n-200 bg-white p-5.5 sm:p-7";

            return integration.page ? (
              <Link
                key={integration.slug}
                to={integrationPath(integration.slug)}
                className={`${shell} transition-all hover:border-ru-blue-300 hover:shadow-md`}
              >
                {inner}
              </Link>
            ) : (
              <div key={integration.slug} className={shell}>
                {inner}
              </div>
            );
          })}
        </div>
      </Band>

      <Band tone="muted" title="What the sync is for">
        <RelatedLinks links={RELATED} />
      </Band>

      <ClosingCta eyebrow="30+ more via webhooks" title="Don't see yours?">
        Anything with a webhook or an API can talk to RateUp, and Zapier covers 3,000+ apps on its
        own. Tell us what you run and we will confirm how it connects.
      </ClosingCta>
    </>
  );
}
