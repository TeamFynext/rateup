import { useState } from "react";

import { useReveal } from "@/components/RateupHomePage/shared/home-ui";
import { MockCard } from "@/components/RateupHomePage/shared/mockups/kit";

import { rowDelay, rowReveal } from "../shared/mini";
import { BAND, SectionHead } from "../shared/section";
import { ORDER_ROWS, ORDER_TABS, type Tone } from "./content";

const TONE: Record<Tone, string> = {
  ok: "border-ru-green-100 bg-ru-green-50 text-ru-green-700",
  warn: "border-ru-amber-200 bg-ru-amber-50 text-ru-amber-700",
  info: "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-700",
  mute: "border-ru-n-200 bg-ru-n-50 text-ru-n-500",
};

function Badge({ tone, children }: Readonly<{ tone: Tone; children: string }>) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

/** The Orders list: every channel in one table, filtered by what needs doing next. */
function OrdersTable() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const [tab, setTab] = useState<string>(ORDER_TABS[0].name);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[20px] border border-ru-n-200 bg-white text-left shadow-[0_24px_64px_rgba(16,24,40,0.08)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-ru-n-100 px-4 py-3.5 sm:px-5">
        <span className="font-display text-[17px] font-bold tracking-[-0.015em] text-ru-n-700">
          Orders
        </span>
        <span className="rounded-lg bg-ru-blue-600 px-3 py-1.5 text-[12.5px] font-semibold text-white">
          Create order
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-ru-n-100 px-3 py-2 sm:px-4">
        {ORDER_TABS.map((item) => {
          const on = item.name === tab;
          return (
            <button
              key={item.name}
              type="button"
              aria-pressed={on}
              onClick={() => setTab(item.name)}
              className={`flex flex-none cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
                on ? "bg-ru-blue-50 text-ru-blue-700" : "text-ru-n-500 hover:bg-ru-n-50"
              }`}
            >
              {item.name}
              <span className="text-[11px] font-medium text-ru-n-400 tabular-nums">
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      <div aria-hidden="true">
        <div className="hidden grid-cols-[1.1fr_1.4fr_0.9fr_0.8fr_1.1fr_1fr_1.5fr] gap-3 border-b border-ru-n-100 bg-ru-n-50 px-5 py-2 text-[11px] font-semibold tracking-[0.06em] text-ru-n-400 uppercase lg:grid">
          <span>Order</span>
          <span>Customer</span>
          <span>Channel</span>
          <span>Total</span>
          <span>Payment</span>
          <span>Fulfilment</span>
          <span>Next step</span>
        </div>
        {ORDER_ROWS.map((row, i) => (
          <div
            key={row.id}
            style={rowDelay(i)}
            className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-b border-ru-n-100 px-4 py-3 last:border-b-0 sm:px-5 lg:grid-cols-[1.1fr_1.4fr_0.9fr_0.8fr_1.1fr_1fr_1.5fr] ${rowReveal(shown)}`}
          >
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-ru-n-700">{row.id}</span>
              <span className="block text-[11.5px] text-ru-n-400">{row.when}</span>
            </span>
            <span className="min-w-0 max-lg:text-right">
              <span className="block truncate text-[13px] text-ru-n-700">{row.name}</span>
              <span className="block truncate text-[11.5px] text-ru-n-400">
                <span className="lg:hidden">{row.channel} · </span>
                {row.handle}
              </span>
            </span>
            <span className="hidden text-[12.5px] text-ru-n-600 lg:block">{row.channel}</span>
            <span className="text-[13px] font-semibold text-ru-n-700 tabular-nums">
              {row.total}
            </span>
            <span className="max-lg:text-right">
              <Badge tone={row.paymentTone}>{row.payment}</Badge>
            </span>
            <span className="hidden lg:block">
              <Badge tone={row.fulfilmentTone}>{row.fulfilment}</Badge>
            </span>
            <span className="hidden truncate text-[12.5px] text-ru-n-500 lg:block">{row.next}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Orders() {
  return (
    <section id="orders" className="border-y border-ru-n-100 bg-ru-n-25">
      <div className={BAND}>
        <SectionHead
          eyebrow="Orders"
          icon={
            <>
              <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
              <path d="m3 7.5 9 4.5 9-4.5M12 12v9" />
            </>
          }
          title="Every order, from every chat, in one list."
        >
          WhatsApp, Instagram, Messenger and your storefront land in the same Orders list, sorted by
          what needs doing next.
        </SectionHead>

        <OrdersTable />
        <p className="mt-4 text-center text-[13px] text-ru-n-400">Illustrative orders.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <MockCard
            className="min-w-0"
            icon={
              <>
                <path d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z" />
                <path d="m8.8 12 2.2 2.2 4.2-4.4" />
              </>
            }
            title="Updates that send themselves"
            body="As an order moves, the customer hears about it on the channel they bought on: confirmation, shipping with tracking, then delivery."
          />
          <MockCard
            className="min-w-0"
            icon={
              <>
                <rect x="3.5" y="5" width="17" height="14" rx="2" />
                <path d="M7 9h4M7 12.5h7M15.5 15.5h1.5" />
              </>
            }
            title="Labels and tracking with EasyPost"
            body="Compare live rates and buy a label from the order. Tracking updates come back from EasyPost on their own."
          />
          <MockCard
            className="min-w-0"
            icon={
              <>
                <path d="M4 12a8 8 0 1 0 2.4-5.7" />
                <path d="M4 4v4.5h4.5" />
              </>
            }
            title="Refunds and returns"
            body="Approve a return, mark it received and refund it from the order, so the record stays in one place."
          />
        </div>
      </div>
    </section>
  );
}
