import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";

import { CheckIcon } from "@/components/RateupHomePage/shared/home-ui";

import { API_TABS } from "./content";
import type { ApiTab } from "./content";

/**
 * "Everything the API unlocks, already built" — four tabs, each pairing the explanation with a
 * mock of the screen it describes.
 *
 * As on the broadcast page, every panel stays in the DOM behind `hidden`: the copy in the
 * inactive tabs is the substance of the section, and a crawler does not click.
 */

/** A slug per tab, for the `id`s that wire the tab to its panel. */
const SLUG: Record<ApiTab, string> = {
  "Templates & Flows": "templates",
  "Catalog & Payments": "catalog",
  "Inbox & Automation": "inbox",
  "AI Agent": "agent",
};

function Chip({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="inline-flex h-5 items-center rounded-4xl border border-ru-blue-200 bg-ru-blue-50 px-2 text-xs font-medium text-ru-blue-600">
      {children}
    </span>
  );
}

/** A bordered panel — the design system's Card at `elevation="sm"`. */
function Panel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-ru-n-200 ring-inset">
      {children}
    </div>
  );
}

function PanelHead({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ru-n-100 px-4 py-3.25">
      {children}
    </div>
  );
}

function PanelTitle({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="font-display text-base/[1.35] font-medium tracking-[-0.01em] text-ru-n-700">
      {children}
    </span>
  );
}

function Overline({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-n-400 uppercase">
      {children}
    </span>
  );
}

/** A pill used for template buttons and automation steps. */
function Pill({ accent = false, children }: Readonly<{ accent?: boolean; children: ReactNode }>) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-md border px-2.75 text-[12.5px] font-medium ${
        accent
          ? "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600"
          : "border-ru-n-200 bg-ru-n-50 text-ru-n-600"
      }`}
    >
      {children}
    </span>
  );
}

function Arrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ru-n-400"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Split({
  heading,
  children,
  mock,
  chips,
}: Readonly<{
  heading: string;
  children: ReactNode;
  mock: ReactNode;
  chips: readonly string[];
}>) {
  return (
    <div className="grid grid-cols-1 items-center gap-11 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div>
        <h3 className="mb-3.5 font-display text-[28px]/[1.18] font-bold tracking-[-0.024em] text-balance text-ru-n-700">
          {heading}
        </h3>
        <div className="mb-5 flex max-w-[46ch] flex-col gap-3.5 text-base/[1.6] text-ru-n-500">
          {children}
        </div>
        <div className="flex flex-wrap gap-1.75">
          {chips.map((chip) => (
            <Chip key={chip}>{chip}</Chip>
          ))}
        </div>
      </div>
      {mock}
    </div>
  );
}

export default function Capabilities() {
  const [active, setActive] = useState<ApiTab>("Templates & Flows");

  return (
    <section className="border-t border-ru-n-100 bg-background">
      <div className="mx-auto max-w-280 px-5 py-[clamp(3rem,7vw,5.5rem)]">
        <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
          On the API, with RateUp
        </span>
        <h2 className="mt-3 mb-6.5 font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-balance text-ru-n-700">
          Everything the API unlocks, already built
        </h2>

        <div
          role="tablist"
          aria-label="What the API unlocks"
          className="mb-7.5 inline-flex h-9 w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg bg-ru-n-50 p-0.75"
        >
          {API_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`api-tab-${SLUG[tab]}`}
              aria-selected={active === tab}
              aria-controls={`api-panel-${SLUG[tab]}`}
              onClick={() => setActive(tab)}
              className={`h-full cursor-pointer rounded-md px-3 text-[13.5px] font-medium whitespace-nowrap transition-colors ${
                active === tab ? "bg-white text-ru-n-700 shadow-xs" : "text-ru-n-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id="api-panel-templates"
          aria-labelledby="api-tab-templates"
          hidden={active !== "Templates & Flows"}
        >
          <Split
            heading="Templates approved, Flows built without code"
            chips={["Template editor", "Carousel", "Flows builder", "Branching logic"]}
            mock={
              <div className="grid gap-3.5">
                <Panel>
                  <PanelHead>
                    <PanelTitle>order_shipped_v2</PanelTitle>
                    <span className="inline-flex h-5 items-center rounded-4xl border border-ru-green-100 bg-ru-green-50 px-2 text-xs font-medium text-ru-green-600">
                      Approved
                    </span>
                  </PanelHead>
                  <div className="flex flex-col gap-3.5 p-4.5">
                    <div className="inline-flex h-8 w-max gap-0.5 rounded-lg bg-ru-n-50 p-0.75">
                      {["Marketing", "Utility", "Authentication"].map((category) => (
                        <span
                          key={category}
                          className={`flex h-full items-center rounded-md px-2.75 text-[12.5px] font-medium ${
                            category === "Utility"
                              ? "bg-white text-ru-n-700 shadow-xs"
                              : "text-ru-n-500"
                          }`}
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                    <p className="rounded-md border border-ru-n-200 bg-ru-n-50 px-3.75 py-3.25 text-sm/[1.5] text-ru-n-600">
                      Hi{" "}
                      <span className="rounded bg-ru-blue-50 px-1.25 py-px font-medium text-ru-blue-600">
                        customer_name
                      </span>
                      , order{" "}
                      <span className="rounded bg-ru-blue-50 px-1.25 py-px font-medium text-ru-blue-600">
                        order_id
                      </span>{" "}
                      has shipped. Track it any time.
                    </p>
                    <div className="flex flex-wrap gap-1.75">
                      <Pill>Quick reply</Pill>
                      <Pill>Visit website</Pill>
                      <Pill>Copy offer code</Pill>
                      <Pill accent>WhatsApp Flow</Pill>
                    </div>
                  </div>
                </Panel>
                <div className="flex items-center gap-3.5 rounded-xl bg-white px-4.5 py-4 shadow-xs ring-1 ring-ru-n-200 ring-inset">
                  <span className="flex size-10 flex-none items-center justify-center rounded-lg border border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 4h6v6H4zM14 14h6v6h-6zM10 7h4a3 3 0 013 3v4" />
                    </svg>
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.75">
                    <PanelTitle>Flow · Post-purchase survey</PanelTitle>
                    <span className="text-[13px] text-ru-n-500">
                      3 screens · rating, dropdown, opt-in · branching on score
                    </span>
                  </div>
                </div>
              </div>
            }
          >
            <p>
              Write in the template editor across Marketing, Utility and Authentication categories,
              then add the buttons you need: quick reply, call, copy offer code, visit website,
              WhatsApp Flow, web survey or catalog. Carousel templates, template sync from Meta and
              display-name change requests are all in the same place.
            </p>
            <p>
              The Flows builder gives you screens, 24 element types — rating, dropdown, date picker,
              photo picker, opt-in and more — and branching logic between them.
            </p>
          </Split>
        </div>

        <div
          role="tabpanel"
          id="api-panel-catalog"
          aria-labelledby="api-tab-catalog"
          hidden={active !== "Catalog & Payments"}
        >
          <Split
            heading="Sell inside the chat"
            chips={["Catalog", "Cart", "UPI", "COD", "Shopify checkout"]}
            mock={
              <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2">
                <Panel>
                  <PanelHead>
                    <PanelTitle>Cart</PanelTitle>
                    <span className="text-[12.5px] text-ru-n-500">2 items</span>
                  </PanelHead>
                  <div className="flex flex-col gap-3 px-4 py-3.5">
                    {["Ceramic mug set", "Gift wrap"].map((item) => (
                      <div key={item} className="flex items-center gap-2.75">
                        <span className="flex size-10 flex-none items-center justify-center rounded-md bg-ru-n-100 text-ru-n-400">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M6 2l-2 4v14a2 2 0 002 2h12a2 2 0 002-2V6l-2-4zM4 6h16M16 10a4 4 0 01-8 0" />
                          </svg>
                        </span>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-[13.5px] font-medium text-ru-n-700">{item}</span>
                          <span className="text-[12.5px] text-ru-n-500">Qty 1</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-ru-n-100 pt-3">
                      <span className="text-[13px] text-ru-n-500">Checkout</span>
                      <span className="inline-flex h-7 items-center rounded-md bg-ru-green-500 px-3 text-[12.5px] font-semibold text-white">
                        Send link
                      </span>
                    </div>
                  </div>
                </Panel>
                <Panel>
                  <div className="border-b border-ru-n-100 px-4 py-3.25">
                    <PanelTitle>Payment options</PanelTitle>
                  </div>
                  <ul className="py-2">
                    {[
                      "WhatsApp native payment",
                      "UPI payment link",
                      "Cash on delivery",
                      "Bank transfer",
                      "Shopify checkout link",
                    ].map((option, index) => (
                      <li
                        key={option}
                        className="flex items-center gap-2.5 px-4 py-2.25 text-[13.5px] text-ru-n-600"
                      >
                        <span
                          className={`size-4 flex-none rounded-full ${
                            index === 0 ? "border-5 border-ru-blue-600" : "border border-ru-n-300"
                          }`}
                        />
                        {option}
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
            }
          >
            <p>
              Push your catalog into WhatsApp and customers browse, build a cart and check out
              without leaving the thread.
            </p>
            <p>
              Collect with WhatsApp native payment, a UPI payment link, cash on delivery or bank
              transfer — or auto-send a{" "}
              <Link
                to="/integrations/shopify"
                className="font-medium text-ru-blue-600 underline underline-offset-2 hover:text-ru-blue-700"
              >
                Shopify
              </Link>{" "}
              checkout link the moment a cart arrives. Orders and payments land on one dashboard.
            </p>
          </Split>
        </div>

        <div
          role="tabpanel"
          id="api-panel-inbox"
          aria-labelledby="api-tab-inbox"
          hidden={active !== "Inbox & Automation"}
        >
          <Split
            heading="One shared inbox with rules that run themselves"
            chips={["Omnichannel", "Assignment", "Triggers", "Chatbot"]}
            mock={
              <div className="grid gap-3.5">
                <Panel>
                  <div className="flex items-center gap-2 border-b border-ru-n-100 px-4 py-3">
                    <span className="inline-flex h-6 items-center gap-1.5 rounded-4xl border border-ru-green-100 bg-ru-green-50 px-2.5 text-xs font-medium text-ru-green-600">
                      <span className="size-1.5 rounded-full bg-ru-green-500" />
                      WhatsApp 12
                    </span>
                    <span className="inline-flex h-6 items-center rounded-4xl border border-ru-n-200 bg-ru-n-50 px-2.5 text-xs font-medium text-ru-n-500">
                      Instagram 4
                    </span>
                    <span className="inline-flex h-6 items-center rounded-4xl border border-ru-n-200 bg-ru-n-50 px-2.5 text-xs font-medium text-ru-n-500">
                      Messenger 1
                    </span>
                  </div>
                  <ul>
                    {[
                      {
                        initials: "PN",
                        name: "Priya Nair",
                        preview: "Can I exchange the size?",
                        tag: "Returns",
                        tone: "border-ru-amber-200 bg-ru-amber-50 text-ru-amber-700",
                      },
                      {
                        initials: "SO",
                        name: "Sam Okoro",
                        preview: "Do you ship to Kochi?",
                        tag: "Sales",
                        tone: "border-ru-n-200 bg-ru-n-50 text-ru-n-500",
                      },
                      {
                        initials: "LF",
                        name: "Lea Fischer",
                        preview: "Payment failed on checkout",
                        tag: "Escalated",
                        tone: "border-red-200 bg-red-50 text-destructive dark:border-red-900/40 dark:bg-red-950/30",
                      },
                    ].map((thread, index, all) => (
                      <li
                        key={thread.initials}
                        className={`flex items-center gap-3 px-4 py-3.25 ${index === all.length - 1 ? "" : "border-b border-ru-n-100"}`}
                      >
                        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-ru-blue-50 text-xs font-semibold text-ru-blue-600">
                          {thread.initials}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-[13.5px] font-medium text-ru-n-700">
                            {thread.name}
                          </span>
                          <span className="truncate text-[12.5px] text-ru-n-500">
                            {thread.preview}
                          </span>
                        </div>
                        <span
                          className={`inline-flex h-5 flex-none items-center rounded-4xl border px-2 text-xs font-medium ${thread.tone}`}
                        >
                          {thread.tag}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>
                <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-ru-n-50 px-4.5 py-4">
                  <span className="w-full">
                    <Overline>Automation</Overline>
                  </span>
                  <Pill>Message received</Pill>
                  <Arrow />
                  <Pill accent>Send template</Pill>
                  <Arrow />
                  <Pill>Assign to Sales</Pill>
                </div>
              </div>
            }
          >
            <p>
              WhatsApp, Instagram and Messenger arrive in one queue. Assign to users or teams, add
              labels and stages, and set business hours with auto-replies for everything outside
              them.
            </p>
            <p>
              Automation triggers on message received, chat closed, contact created or a Shopify
              event — then sends a template, a Flow or a survey, assigns, labels, calls an external
              API or hands off to a chatbot.
            </p>
          </Split>
        </div>

        <div
          role="tabpanel"
          id="api-panel-agent"
          aria-labelledby="api-tab-agent"
          hidden={active !== "AI Agent"}
        >
          <Split
            heading="Meta's AI agent for WhatsApp, onboarded from RateUp"
            chips={["Knowledge base", "Handoff", "Follow-ups", "Guardrails"]}
            mock={
              <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2">
                <Panel>
                  <div className="border-b border-ru-n-100 px-4 py-3.25">
                    <PanelTitle>Knowledge</PanelTitle>
                  </div>
                  <ul className="py-2">
                    {["Business info", "18 FAQs", "Size guide.pdf", "Website · 24 pages"].map(
                      (item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2.5 px-4 py-2.25 text-[13.5px] text-ru-n-600"
                        >
                          <CheckIcon className="size-3.75 flex-none text-ru-green-500" />
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </Panel>
                <div className="grid gap-3.5">
                  <div className="rounded-xl bg-white px-4.5 py-4 shadow-xs ring-1 ring-ru-n-200 ring-inset">
                    <Overline>Handoff</Overline>
                    <p className="mt-2.25 text-[13.5px]/[1.5] text-ru-n-600">
                      On refund, damage or "talk to a human" → assign to Support and pause the
                      agent.
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-4.5 py-4 shadow-xs ring-1 ring-ru-n-200 ring-inset">
                    <Overline>Never say</Overline>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {["guaranteed", "lifetime warranty", "free shipping"].map((phrase) => (
                        <span
                          key={phrase}
                          className="inline-flex h-5.5 items-center rounded-4xl border border-red-200 bg-red-50 px-2.25 text-xs font-medium text-destructive dark:border-red-900/40 dark:bg-red-950/30"
                        >
                          {phrase}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            }
          >
            <p>
              Give the agent your business info, FAQs, files and websites as knowledge, then decide
              when it hands off to a human.
            </p>
            <p>
              Set follow-up messages, restrict it to an audience allowlist, and list the phrases it
              must never say. See what else it can do on{" "}
              <Link
                to="/products/ai-automation"
                className="font-medium text-ru-blue-600 underline underline-offset-2 hover:text-ru-blue-700"
              >
                AI automation
              </Link>
              .
            </p>
          </Split>
        </div>
      </div>
    </section>
  );
}
