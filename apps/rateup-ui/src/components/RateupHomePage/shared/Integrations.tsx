import { Link } from "@tanstack/react-router";

import {
  DEVELOPER_DOCS_URL,
  INTEGRATION_GROUPS,
  INTEGRATIONS,
  type IntegrationDefinition,
  integrationPath,
} from "@/config/integrations";

import { ArrowRight, StarLabel } from "./home-ui";

const FEATURED = INTEGRATIONS.filter((intg) => intg.featured);

/* One tile is raised at a time. The delay is `index x stride`, and the stride is the 6.3s
   cycle in `--animate-ru-card-lift` divided by the number of tiles (the featured integrations
   plus the "more" card), so the wave hands off cleanly and restarts without a gap. */
const LIFT_STRIDE_MS = 6300 / (FEATURED.length + 1);
const liftDelay = (index: number) => ({
  animationDelay: `${Math.round(index * LIFT_STRIDE_MS)}ms`,
});

/** The featured integration tiles, for product pages that frame them with their own heading. */
export function IntegrationTiles() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
      {FEATURED.map((intg, i) => {
        const body = (
          <>
            <span
              aria-hidden="true"
              className="flex size-11 flex-none items-center justify-center rounded-xl border border-ru-n-200 bg-ru-n-50"
            >
              <intg.Mark className="size-7.5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-ru-n-700">{intg.name}</div>
              <div className="truncate text-[13.5px] text-ru-n-400">{intg.role}</div>
            </div>
          </>
        );

        const shell =
          "flex h-24 min-w-0 animate-ru-card-lift items-center gap-3.5 rounded-2xl border border-ru-n-200 bg-white px-4.5 transition-colors motion-reduce:animate-none";

        return intg.page ? (
          <Link
            key={intg.slug}
            to={integrationPath(intg.slug)}
            style={liftDelay(i)}
            className={`${shell} hover:border-ru-blue-300`}
          >
            {body}
          </Link>
        ) : (
          <div key={intg.slug} style={liftDelay(i)} className={`${shell} hover:border-ru-n-300`}>
            {body}
          </div>
        );
      })}

      <Link
        to="/integrations"
        style={liftDelay(FEATURED.length)}
        className="flex h-24 min-w-0 animate-ru-card-lift flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ru-n-300 px-4.5 text-center transition-colors hover:border-ru-blue-600 motion-reduce:animate-none"
      >
        <span className="text-[15.5px] font-semibold text-ru-n-600">
          +{INTEGRATIONS.length - FEATURED.length} more, plus an API
        </span>
        <span className="text-[13.5px] text-ru-n-400">See all integrations</span>
      </Link>
    </div>
  );
}

function IntegrationRow({ intg }: Readonly<{ intg: IntegrationDefinition }>) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="flex size-10 flex-none items-center justify-center rounded-xl border border-ru-n-100 bg-ru-n-25"
      >
        <intg.Mark className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ru-n-700">{intg.name}</span>
        <span className="block truncate text-[13px] text-ru-n-400">{intg.role}</span>
      </span>
    </>
  );
  const row = "flex items-center gap-3 rounded-xl px-2 py-2";

  return intg.page ? (
    <Link
      to={integrationPath(intg.slug)}
      className={`group ${row} transition-colors hover:bg-ru-blue-50`}
    >
      {body}
      <ArrowRight className="size-4 flex-none text-ru-n-300 transition-all group-hover:translate-x-0.5 group-hover:text-ru-blue-600" />
    </Link>
  ) : (
    <div className={row}>{body}</div>
  );
}

export default function Integrations() {
  return (
    <section id="integrations" className="bg-ru-n-50">
      <div className="mx-auto max-w-280 px-5 py-12 sm:py-18">
        <div className="mx-auto mb-9 max-w-190 text-center sm:mb-12">
          <StarLabel>Integrations</StarLabel>
          <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
            Works with the tools <span className="text-[#0F8C4C]">you already run.</span>
          </h2>
          <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
            Connect your store, POS and CRM. Orders, customers and points sync both ways.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INTEGRATION_GROUPS.map((group) => (
            <div key={group.id} className="rounded-3xl border border-ru-n-200 bg-white p-3.5 pt-5">
              <div className="mb-2 px-2">
                <h3 className="font-display text-[17px] font-bold tracking-[-0.01em] text-ru-n-700">
                  {group.label}
                </h3>
                <p className="text-[13.5px] text-ru-n-500">{group.blurb}</p>
              </div>
              <ul className="list-none space-y-0.5 p-0">
                {INTEGRATIONS.filter((intg) => intg.group === group.id).map((intg) => (
                  <li key={intg.slug}>
                    <IntegrationRow intg={intg} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-5 rounded-3xl bg-ru-blue-900 px-6 py-5.5 text-white sm:flex-row sm:items-center sm:px-7">
          <span
            aria-hidden="true"
            className="flex size-11 flex-none items-center justify-center rounded-xl bg-white/10 font-mono text-sm font-bold text-ru-blue-200"
          >
            {"{ }"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[17px] font-bold">REST API &amp; webhooks</p>
            <p className="text-[14.5px] text-white/70">
              Connect anything else with our documented API and outbound webhooks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href={DEVELOPER_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10.5 items-center rounded-full bg-white px-5 text-[14.5px] font-semibold text-ru-blue-900 transition-colors hover:bg-ru-blue-50"
            >
              Read the docs
            </a>
            <Link
              to="/integrations"
              className="group inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-white/85 hover:text-white"
            >
              See all integrations
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
