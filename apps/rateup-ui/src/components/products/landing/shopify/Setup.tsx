import { EVENT_ROWS, SETUP_STEPS, SHOPIFY_STATS } from "./content";
import { H2, Overline } from "./sections";

/** Setup steps, the events table, and the three figures beneath it. */

export function Setup() {
  return (
    <section className="border-y border-ru-n-100 bg-ru-n-50 px-5 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Overline>Setup</Overline>
          <H2>Connected in three steps</H2>
        </div>

        <ol className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {SETUP_STEPS.map((step) => (
            <li
              key={step.n}
              className="flex flex-col items-start gap-3.5 rounded-xl bg-white p-6 shadow-xs ring-1 ring-ru-n-200 ring-inset"
            >
              <span className="inline-flex size-8.5 items-center justify-center rounded-full border border-ru-blue-200 bg-ru-blue-50 font-display text-[15px] font-bold text-ru-blue-600">
                {step.n}
              </span>
              <h3 className="font-display text-base/[1.35] font-medium tracking-[-0.01em] text-ru-n-700">
                {step.title}
              </h3>
              <p className="text-sm/[1.55] text-ru-n-500">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="flex items-center gap-2 text-sm text-ru-n-500">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 flex-none text-ru-blue-600"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Mandatory GDPR webhooks — customer data request, customer redact and shop redact — are
          handled.
        </p>
      </div>
    </section>
  );
}

export function Events() {
  return (
    <section className="px-5 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-col gap-7">
        <div className="flex max-w-[66ch] flex-col gap-3">
          <Overline>Events</Overline>
          <H2>Every store event, one WhatsApp message</H2>
          <p className="text-base/[1.6] text-ru-n-500">
            These are the events RateUp ships today. Each arrives as a store webhook; a checkout
            counts as abandoned once it has sat untouched for the delay you choose.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl bg-white shadow-xs ring-1 ring-ru-n-200 ring-inset">
          <table className="w-full min-w-120 border-collapse text-left text-[13.5px]">
            <caption className="sr-only">
              Shopify events RateUp can act on, what it does and the typical delay
            </caption>
            <thead>
              <tr className="bg-ru-n-50">
                {["Shopify event", "What RateUp can do", "Typical delay"].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] whitespace-nowrap text-ru-n-500 uppercase"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVENT_ROWS.map(([event, action, delay]) => (
                <tr key={event} className="border-t border-ru-n-100">
                  <th
                    scope="row"
                    className="px-4 py-3 text-left align-top font-medium text-ru-n-700"
                  >
                    {event}
                  </th>
                  <td className="px-4 py-3 align-top text-ru-n-600">{action}</td>
                  <td className="px-4 py-3 align-top whitespace-nowrap text-ru-n-600">{delay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[13px] text-ru-n-400">
          Delays available on every event: 1 hour, 2 hours, 5 hours, 10 hours, 1 day, 2 days.
        </p>
      </div>
    </section>
  );
}

export function Stats() {
  return (
    <section className="border-y border-ru-n-100 bg-ru-n-50 px-5 py-[clamp(2rem,4vw,3rem)]">
      <div className="mx-auto grid max-w-280 grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-7">
        {SHOPIFY_STATS.map((stat) => (
          <div key={stat.value} className="flex flex-col items-start gap-1.5">
            <span className="font-display text-[34px]/[1.05] font-bold tracking-[-0.028em] text-ru-n-700">
              {stat.value}
            </span>
            <span className="text-[13px]/[1.45] text-ru-n-500">{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
