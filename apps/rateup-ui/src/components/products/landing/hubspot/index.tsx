import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";

import { Badge, Card, CardTitle, H2, Overline } from "../shopify/sections";
import { HUBSPOT_FAQS, HUBSPOT_FEATURES, HUBSPOT_SETUP_STEPS, HUBSPOT_SYNC_ROWS } from "./content";

/**
 * `/integrations/hubspot`.
 *
 * Built from the store pages' bands (`../shopify/sections`) so the integration pages read as a
 * set. A CRM has no order journeys to show; the page is about what syncs, which way, and the
 * notes that put WhatsApp on the contact's timeline.
 */

const RELATED = [
  { to: "/integrations", label: "All integrations" },
  { to: "/integrations/shopify", label: "Shopify integration" },
  { to: "/products/whatsapp-business-api", label: "WhatsApp Business API" },
  { to: "/pricing", label: "Pricing" },
] as const;

const primaryCta =
  "inline-flex h-10 items-center rounded-full bg-ru-star-cta px-5.5 text-sm font-semibold text-ru-blue-900 shadow-xs transition-[filter] hover:brightness-[0.97]";
const secondaryCta =
  "inline-flex h-10 items-center rounded-lg border border-ru-n-200 bg-white px-5.5 text-sm font-semibold text-ru-n-700 shadow-xs transition-colors hover:border-ru-n-300";

function Hero() {
  return (
    <section className="px-5 pt-[clamp(2.5rem,5vw,4rem)] pb-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto grid max-w-280 grid-cols-1 items-center gap-[clamp(2rem,4vw,3.5rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col items-start gap-5.5">
          <Badge tone="accent">HubSpot integration</Badge>
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)]/[1.06] font-bold tracking-[-0.03em] text-pretty text-ru-n-700">
            Your WhatsApp contacts, leads and conversations in HubSpot
          </h1>
          <p className="max-w-[56ch] text-[18px]/[1.6] text-pretty text-ru-n-500">
            Keep contacts in step both ways, turn Leads board leads into HubSpot deals that move
            with them, and log closed conversations and survey responses on the contact.
          </p>
          <div className="flex flex-wrap gap-3 pt-0.5">
            <Link to="/signup" className={primaryCta}>
              Start free
            </Link>
            <Link to={BOOK_DEMO_ROUTE} className={secondaryCta}>
              Book a Demo
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge tone="outline">Connect in two clicks</Badge>
            <Badge tone="outline">Two-way sync</Badge>
            <Badge tone="outline">Works with HubSpot's free CRM</Badge>
          </div>
        </div>

        {/* A note as it lands on the contact's HubSpot timeline when a conversation closes. */}
        <div className="flex flex-col gap-3 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-5 shadow-xs">
          <span className="text-xs tracking-[0.06em] text-ru-n-400 uppercase">
            HubSpot · Contact timeline
          </span>
          <div className="flex flex-col gap-2 rounded-xl bg-white p-4 text-sm/[1.55] text-ru-n-700 shadow-xs ring-1 ring-ru-n-200 ring-inset">
            <span className="font-medium">WhatsApp conversation #1042 closed</span>
            <span className="text-[13px] text-ru-n-500">Closed by Sam · Resolved · 6 messages</span>
            <span className="text-[13px] text-ru-n-600">
              Customer: Is the bulk order on track?
              <br />
              Sam: Yes, it ships tomorrow. You will get the tracking link here.
            </span>
          </div>
          <div className="flex gap-2">
            {["Deal: Qualified", "Lead: In talks"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-ru-blue-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-ru-blue-600"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Setup() {
  return (
    <section className="border-y border-ru-n-100 bg-ru-n-50 px-5 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Overline>Setup</Overline>
          <H2>Connected in three steps</H2>
        </div>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {HUBSPOT_SETUP_STEPS.map((step) => (
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
        <p className="text-sm text-ru-n-500">
          To remove RateUp's access from HubSpot's side, uninstall it under Settings › Integrations
          › Connected apps in HubSpot.
        </p>
      </div>
    </section>
  );
}

function SyncTable() {
  return (
    <section className="px-5 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-col gap-7">
        <div className="flex max-w-[66ch] flex-col gap-3">
          <Overline>What syncs</Overline>
          <H2>Each sync has its own switch</H2>
          <p className="text-base/[1.6] text-ru-n-500">
            Nothing moves until you turn it on. Deleting a record on one side leaves the other as it
            is.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl bg-white shadow-xs ring-1 ring-ru-n-200 ring-inset">
          <table className="w-full min-w-140 border-collapse text-left text-[13.5px]">
            <caption className="sr-only">
              What RateUp syncs with HubSpot, and in which direction
            </caption>
            <thead>
              <tr className="bg-ru-n-50">
                {["Record", "Direction", "How"].map((heading) => (
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
              {HUBSPOT_SYNC_ROWS.map(([record, direction, how]) => (
                <tr key={record} className="border-t border-ru-n-100">
                  <th
                    scope="row"
                    className="px-4 py-3 text-left align-top font-medium whitespace-nowrap text-ru-n-700"
                  >
                    {record}
                  </th>
                  <td className="px-4 py-3 align-top whitespace-nowrap text-ru-n-600">
                    {direction}
                  </td>
                  <td className="px-4 py-3 align-top text-ru-n-600">{how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="border-y border-ru-n-100 bg-ru-n-50 px-5 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-col gap-7">
        <div className="flex flex-col gap-3">
          <Overline>Built for a CRM</Overline>
          <H2>Two-way sync without the mess</H2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
          {HUBSPOT_FEATURES.map((feature) => (
            <Card key={feature.title}>
              <h3 className="mb-1.5">
                <CardTitle>{feature.title}</CardTitle>
              </h3>
              <p className="text-[13.5px]/[1.5] text-ru-n-500">{feature.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Answers stay in the DOM behind `hidden`: the route's FAQPage JSON-LD describes them. */
function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="px-5 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto grid max-w-280 grid-cols-1 items-start gap-[clamp(1.5rem,4vw,3.5rem)] lg:grid-cols-[minmax(0,0.62fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <H2>HubSpot + WhatsApp, answered</H2>
          <p className="text-[15px]/[1.6] text-ru-n-500">
            Still deciding?{" "}
            <Link
              to={BOOK_DEMO_ROUTE}
              className="font-medium text-ru-blue-600 underline underline-offset-2 hover:text-ru-blue-700"
            >
              Book a demo
            </Link>{" "}
            and we'll walk through your CRM setup.
          </p>
        </div>
        <div className="flex flex-col">
          {HUBSPOT_FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <div key={faq.question} className="border-b border-ru-n-100">
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 py-4.5 text-left text-[17px]/[1.35] font-medium tracking-[-0.01em] text-ru-n-700"
                  >
                    {faq.question}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                      className={`size-4.25 flex-none text-ru-n-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </h3>
                <p
                  hidden={!open}
                  className="max-w-[66ch] pb-5 text-base/[1.6] text-ru-n-500 not-[[hidden]]:animate-ru-rise"
                >
                  {faq.answer}
                </p>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-4.5 text-sm">
            {RELATED.map((link) => (
              <Link key={link.to} to={link.to} className="text-ru-blue-600 hover:text-ru-blue-700">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingBand() {
  return (
    <section className="px-5 pb-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-wrap items-center justify-between gap-6 rounded-2xl bg-ru-blue-600 p-[clamp(2rem,4vw,3rem)]">
        <h2 className="max-w-[24ch] font-display text-[clamp(1.5rem,3vw,2rem)]/[1.15] font-bold tracking-[-0.028em] text-white">
          Connect HubSpot to your WhatsApp inbox.
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/signup"
            className="inline-flex h-10 items-center rounded-lg bg-white px-5.5 text-sm font-semibold text-ru-blue-700 shadow-xs transition-transform hover:-translate-y-px"
          >
            Start free
          </Link>
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

export default function HubSpotIntegrationPage() {
  return (
    <>
      <Hero />
      <Setup />
      <SyncTable />
      <Features />
      <Faq />
      <ClosingBand />
    </>
  );
}
