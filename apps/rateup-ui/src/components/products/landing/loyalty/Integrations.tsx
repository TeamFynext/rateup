import { Link } from "@tanstack/react-router";

import { INTEGRATIONS, integrationPath } from "@/config/integrations";

/**
 * The integrations band.
 *
 * The design draws monogram placeholders and notes that "partner logos drop in at a uniform 24px
 * cap-height, grayscale" — so this renders the real marks from `config/integrations.ts`, and the
 * entries that have a landing page are links.
 */
export default function Integrations() {
  return (
    <section
      id="integrations"
      className="border-b border-ru-n-100 bg-ru-n-50 py-[clamp(3.5rem,8vw,6.5rem)]"
    >
      <div className="mx-auto max-w-290 px-5">
        <div className="mb-[clamp(1.5rem,3vw,2rem)] flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-140">
            <div className="mb-3.5 text-[12.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
              Integrations
            </div>
            <h2 className="font-display text-[clamp(1.6875rem,3.8vw,2.375rem)]/[1.12] font-bold tracking-[-0.028em] text-ru-n-700">
              Plug RateUp into your stack.
            </h2>
          </div>
          <p className="max-w-[38ch] text-[15.5px] text-ru-n-500">
            Orders, customers and points sync both ways. Most setups are live the same day.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {INTEGRATIONS.map((integration) => {
            const body = (
              <>
                <span className="flex size-11 flex-none items-center justify-center rounded-[11px] border border-ru-n-200 bg-ru-n-50">
                  {integration.logo ? (
                    <img
                      src={integration.logo}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-6 object-contain"
                    />
                  ) : (
                    <span className="font-mono text-sm font-bold text-ru-n-500">{"{ }"}</span>
                  )}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-ru-n-700">
                    {integration.name}
                  </div>
                  <div className="truncate text-[13.5px] text-ru-n-400">{integration.role}</div>
                </div>
              </>
            );
            const shell =
              "flex h-24 min-w-0 items-center gap-3.5 rounded-[14px] border border-ru-n-200 bg-white px-4.5 transition-all";

            return integration.page ? (
              <Link
                key={integration.slug}
                to={integrationPath(integration.slug)}
                className={`${shell} hover:-translate-y-0.5 hover:border-ru-blue-300 hover:shadow-md`}
              >
                {body}
              </Link>
            ) : (
              <div
                key={integration.slug}
                className={`${shell} hover:-translate-y-0.5 hover:border-ru-n-300 hover:shadow-md`}
              >
                {body}
              </div>
            );
          })}

          <Link
            to="/integrations"
            className="flex h-24 min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] border border-dashed border-ru-n-300 px-4.5 text-center transition-all hover:-translate-y-0.5 hover:border-ru-blue-600"
          >
            <span className="text-[15.5px] font-semibold text-ru-n-600">30+ more via webhooks</span>
            <span className="text-[13.5px] text-ru-n-400">See all integrations</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
