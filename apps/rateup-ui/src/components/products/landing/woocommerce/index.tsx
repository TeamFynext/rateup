import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";

import { Badge, Card, CardTitle, H2, Overline } from "../shopify/sections";
import { WOO_EVENT_ROWS, WOO_FAQS, WOO_FEATURES, WOO_SETUP_STEPS } from "./content";

/**
 * `/integrations/woocommerce`.
 *
 * Built from the Shopify page's bands (`../shopify/sections`) so the two store pages read as a
 * pair, but shorter: WooCommerce is connected from inside RateUp rather than installed from an app
 * store, and has no abandoned-checkout or cash-on-delivery journeys to show.
 */

const RELATED = [
  { to: "/integrations", label: "All integrations" },
  { to: "/integrations/shopify", label: "Shopify integration" },
  { to: "/products/whatsapp-loyalty", label: "WhatsApp Loyalty" },
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
          <Badge tone="accent">WooCommerce integration</Badge>
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)]/[1.06] font-bold tracking-[-0.03em] text-pretty text-ru-n-700">
            WooCommerce order updates, loyalty and coupons on WhatsApp
          </h1>
          <p className="max-w-[56ch] text-[18px]/[1.6] text-pretty text-ru-n-500">
            Message customers when their order is paid, completed or refunded, award loyalty points
            on completed orders, and turn rewards into coupons that work at your checkout.
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
            <Badge tone="outline">No plugin to install</Badge>
            <Badge tone="outline">Official WhatsApp Business API</Badge>
            <Badge tone="outline">Webhooks set up for you</Badge>
          </div>
        </div>

        {/* A message as a customer receives it on "Order completed". */}
        <div className="flex flex-col gap-3 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-5 shadow-xs">
          <span className="text-xs tracking-[0.06em] text-ru-n-400 uppercase">Order completed</span>
          <div className="rounded-xl rounded-tl-sm bg-white p-4 text-sm/[1.55] text-ru-n-700 shadow-xs ring-1 ring-ru-n-200 ring-inset">
            Hi Asha, your order #1042 (Masala Tea ×2) has been delivered. You earned 125 points —
            reply <span className="font-medium">/points</span> to see your balance.
          </div>
          <div className="flex gap-2">
            {["Rate your order", "My points"].map((label) => (
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
          {WOO_SETUP_STEPS.map((step) => (
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
          Your store must be served over HTTPS. To revoke access from WordPress, delete RateUp's key
          under WooCommerce › Settings › Advanced › REST API.
        </p>
      </div>
    </section>
  );
}

function Events() {
  return (
    <section className="px-5 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-col gap-7">
        <div className="flex max-w-[66ch] flex-col gap-3">
          <Overline>Events</Overline>
          <H2>What RateUp does with your store's events</H2>
          <p className="text-base/[1.6] text-ru-n-500">
            Order messages are Automation rules on the WooCommerce Event trigger, with template
            variables filled from the order. Each status change sends one message, even when
            WooCommerce reports it twice.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl bg-white shadow-xs ring-1 ring-ru-n-200 ring-inset">
          <table className="w-full min-w-120 border-collapse text-left text-[13.5px]">
            <caption className="sr-only">
              WooCommerce events RateUp acts on, and what it does
            </caption>
            <thead>
              <tr className="bg-ru-n-50">
                {["WooCommerce event", "What RateUp can do"].map((heading) => (
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
              {WOO_EVENT_ROWS.map(([event, action]) => (
                <tr key={event} className="border-t border-ru-n-100">
                  <th
                    scope="row"
                    className="px-4 py-3 text-left align-top font-medium whitespace-nowrap text-ru-n-700"
                  >
                    {event}
                  </th>
                  <td className="px-4 py-3 align-top text-ru-n-600">{action}</td>
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
          <Overline>Beyond messages</Overline>
          <H2>Loyalty, contacts and catalog from the same store</H2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
          {WOO_FEATURES.map((feature) => (
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
          <H2>WooCommerce + WhatsApp, answered</H2>
          <p className="text-[15px]/[1.6] text-ru-n-500">
            Still deciding?{" "}
            <Link
              to={BOOK_DEMO_ROUTE}
              className="font-medium text-ru-blue-600 underline underline-offset-2 hover:text-ru-blue-700"
            >
              Book a demo
            </Link>{" "}
            and we'll walk through your store's setup.
          </p>
        </div>
        <div className="flex flex-col">
          {WOO_FAQS.map((faq, index) => {
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
          Connect your WooCommerce store to WhatsApp.
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

export default function WooCommerceIntegrationPage() {
  return (
    <>
      <Hero />
      <Setup />
      <Events />
      <Features />
      <Faq />
      <ClosingBand />
    </>
  );
}
