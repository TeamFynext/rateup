import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";

import { JOURNEY_LABEL, JOURNEY_TABS } from "./content";
import type { JourneyTab } from "./content";
import { Card, CardTitle, H2, LinkArrow, Overline, Tag } from "./sections";

/**
 * "Four journeys off the same store data" — a line-variant tab strip, each panel pairing the
 * explanation with a mock of the screen it describes.
 *
 * All four panels stay in the DOM behind `hidden`: the copy in the inactive tabs is the substance
 * of the section, and it is also where this page's internal links to the product cluster live.
 */

function Panel({
  heading,
  body,
  tags,
  link,
  mock,
}: Readonly<{
  heading: string;
  body: ReactNode;
  tags: readonly string[];
  link: { to: string; label: string };
  mock: ReactNode;
}>) {
  return (
    <div className="grid grid-cols-1 items-start gap-[clamp(1.5rem,3.5vw,2.75rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      <div className="flex flex-col items-start gap-4.5">
        <h3 className="font-display text-[22px]/[1.25] font-bold tracking-[-0.018em] text-ru-n-700">
          {heading}
        </h3>
        <p className="max-w-[66ch] text-base/[1.6] text-ru-n-500">{body}</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
        <Link to={link.to} className="text-sm font-medium text-ru-blue-600 hover:text-ru-blue-700">
          {link.label}
          <LinkArrow />
        </Link>
      </div>
      {mock}
    </div>
  );
}

const MAPPINGS: readonly (readonly [string, string])[] = [
  ["customer_name", "Customer First Name"],
  ["order_id", "Order Name"],
  ["amount", "Total Price + Currency"],
  ["track_url", "Tracking URL"],
];

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 text-ru-n-400"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function Journeys() {
  const [active, setActive] = useState<JourneyTab>("orders");

  return (
    <section className="px-5 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto flex max-w-280 flex-col gap-7">
        <div className="flex max-w-[66ch] flex-col gap-3">
          <Overline>What you can run</Overline>
          <H2>Four journeys off the same store data</H2>
        </div>

        <div
          role="tablist"
          aria-label="Shopify journeys"
          className="flex gap-5.5 overflow-x-auto border-b border-ru-n-200"
        >
          {JOURNEY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`shopify-tab-${tab}`}
              aria-selected={active === tab}
              aria-controls={`shopify-panel-${tab}`}
              onClick={() => setActive(tab)}
              className={`relative cursor-pointer pb-3 text-sm font-medium whitespace-nowrap after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-t-sm ${
                active === tab
                  ? "text-ru-n-700 after:bg-ru-blue-600"
                  : "text-ru-n-500 after:bg-transparent"
              }`}
            >
              {JOURNEY_LABEL[tab]}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id="shopify-panel-orders"
          aria-labelledby="shopify-tab-orders"
          hidden={active !== "orders"}
        >
          <Panel
            heading="Confirmation to delivery, from your verified number"
            body="Map template variables to Order Name, Customer First Name, Total Price, Currency, Order URL, Tracking URL, Items Fulfilled, Pending Items, Payment Method, Financial Status, Fulfillment Status and more. Use the product image as the template header."
            tags={["Variable mapping", "Product image header", "Product-specific rules"]}
            link={{
              to: "/products/whatsapp-business-api",
              label: "Runs on the WhatsApp Business API",
            }}
            mock={
              <Card>
                <CardTitle>Variable mapping</CardTitle>
                <div className="mt-4 flex flex-col gap-2.5">
                  {MAPPINGS.map(([token, field]) => (
                    <div key={token} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                      <span className="rounded-md border border-ru-blue-200 bg-ru-blue-50 px-2.25 py-1.25 text-[12.5px] text-ru-blue-600">
                        {token}
                      </span>
                      <Arrow />
                      <span className="text-[13px] text-ru-n-600">{field}</span>
                    </div>
                  ))}
                </div>
              </Card>
            }
          />
        </div>

        <div
          role="tabpanel"
          id="shopify-panel-cart"
          aria-labelledby="shopify-tab-cart"
          hidden={active !== "cart"}
        >
          <Panel
            heading="Recover carts with the checkout link in the message"
            body={
              <>
                RateUp polls abandoned checkouts and sends your recovery template with the Checkout
                Recovery Link variable. Combine it with a &ldquo;Copy offer code&rdquo; button so
                the discount travels with the message.
              </>
            }
            tags={["Recovery link", "Offer code button", "Scheduled checks"]}
            link={{
              to: "/products/whatsapp-broadcast",
              label: "Promotional sends live in WhatsApp Broadcast",
            }}
            mock={
              <Card tone="quiet">
                <div className="flex flex-col items-end gap-1.5">
                  <div className="max-w-[78%] rounded-2xl rounded-br-xs border border-ru-green-100 bg-ru-green-50 px-3.25 pt-2.5 pb-2 text-[14.5px]/[1.45] text-ru-n-700 shadow-xs">
                    Still thinking it over, Asha? Your cart is saved. Use code BACK10 for 10% off —
                    checkout stays open for 24 hours.
                    <div className="mt-1 flex items-center justify-end gap-1.25 text-[11px] text-ru-n-400">
                      <span>19:40</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-3.5 flex-none text-ru-blue-400"
                        aria-hidden="true"
                      >
                        <path d="M1 13l4 4L13 7" />
                        <path d="M8 13l4 4L20 7" />
                      </svg>
                    </div>
                  </div>
                  {["Copy offer code", "Complete checkout"].map((reply) => (
                    <span
                      key={reply}
                      className="rounded-md border border-ru-green-100 bg-white px-2.75 py-1.5 text-[13px] font-semibold text-ru-green-600"
                    >
                      {reply}
                    </span>
                  ))}
                </div>
              </Card>
            }
          />
        </div>

        <div
          role="tabpanel"
          id="shopify-panel-loyalty"
          aria-labelledby="shopify-tab-loyalty"
          hidden={active !== "loyalty"}
        >
          <Panel
            heading="Points on every paid order, automatically"
            body={
              <>
                With &ldquo;Enable Shopify order points&rdquo; on, points are awarded when an order
                is paid, revoked on cancellation and adjusted when an order is edited. Customers
                check their balance by messaging a command like /points; your tiers, referrals and
                expiry rules apply.
              </>
            }
            tags={["Award on paid", "Revoke on cancel", "Balance on WhatsApp", "Tiers & referrals"]}
            link={{ to: "/products/whatsapp-loyalty", label: "See WhatsApp Loyalty" }}
            mock={
              <Card>
                <div className="flex items-baseline justify-between gap-3">
                  <CardTitle>Asha's balance</CardTitle>
                  <span className="font-display text-[26px] font-bold tracking-[-0.028em] tabular-nums text-ru-n-700">
                    320
                  </span>
                </div>
                <div className="mt-3.5 flex flex-col">
                  {[
                    ["Order #1042 paid", "+50", "up"],
                    ["Order #1039 cancelled", "−30", "down"],
                    ["Referral joined", "+100", "up"],
                  ].map(([label, delta, dir]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-3 border-t border-ru-n-100 py-2.5"
                    >
                      <span className="text-[13.5px] text-ru-n-600">{label}</span>
                      <span
                        className={`text-[13.5px] font-medium tabular-nums ${dir === "up" ? "text-ru-green-600" : "text-destructive"}`}
                      >
                        {delta}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="mt-3.5 inline-flex rounded-md border border-ru-n-200 bg-ru-n-50 px-2.5 py-1.25 text-[12.5px] text-ru-n-500">
                  Customer sends /points
                </span>
              </Card>
            }
          />
        </div>

        <div
          role="tabpanel"
          id="shopify-panel-feedback"
          aria-labelledby="shopify-tab-feedback"
          hidden={active !== "feedback"}
        >
          <Panel
            heading="Ask after delivery, route happy customers to Google"
            body="Send a WhatsApp Flow rating after fulfilment. Customers above your chosen star threshold get your Google review link; low scores can be assigned to a team member to follow up."
            tags={["Post-delivery Flow", "Google review redirect", "Escalation"]}
            link={{ to: "/products/whatsapp-feedback", label: "See WhatsApp Feedback" }}
            mock={
              <Card>
                <CardTitle>Rating Flow</CardTitle>
                <p className="mt-2.5 mb-3.5 text-[13.5px] text-ru-n-500">
                  Sent 1 day after Orders fulfilled.
                </p>
                <div className="flex gap-1.5" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <svg key={i} viewBox="0 0 24 24" className="size-5.5 fill-ru-amber-500">
                      <path d="M12 2l2.9 6.3 6.9.8-5.1 4.6 1.4 6.8L12 17.1 5.9 20.5l1.4-6.8L2.2 9.1l6.9-.8L12 2Z" />
                    </svg>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-2.5">
                  {[
                    ["4 stars and up → Google review link", "text-ru-green-600"],
                    ["3 stars and below → assigned to a team member", "text-ru-amber-700"],
                  ].map(([label, tone]) => (
                    <div
                      key={label}
                      className="flex items-center gap-2.25 text-[13.5px] text-ru-n-600"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`size-3.75 flex-none ${tone}`}
                        aria-hidden="true"
                      >
                        <path d="M15 10l5 5-5 5" />
                        <path d="M4 4v7a4 4 0 0 0 4 4h12" />
                      </svg>
                      {label}
                    </div>
                  ))}
                </div>
              </Card>
            }
          />
        </div>
      </div>
    </section>
  );
}
