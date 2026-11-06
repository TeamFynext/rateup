import { useReveal } from "@/components/RateupHomePage/shared/home-ui";
import { Inset } from "@/components/RateupHomePage/shared/mockups/kit";

import { RowsMini, rowDelay, rowReveal } from "../shared/mini";

const ROW = "rounded-lg border border-ru-n-200 bg-white px-2.75 py-2";

/** Products with variants and stock, and where each is published. */
export function CatalogMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const rows = [
    { name: "Cedar & Smoke candle", meta: "2 sizes · 48 in stock", tone: "text-ru-n-400" },
    { name: "Linen throw", meta: "3 colours · 12 in stock", tone: "text-ru-n-400" },
    { name: "Merino wool blanket", meta: "Low stock · 3 left", tone: "text-ru-amber-700" },
  ];

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <div
            key={row.name}
            style={rowDelay(i)}
            className={`flex items-center gap-2.5 ${ROW} ${rowReveal(shown)}`}
          >
            <span className="size-7 flex-none rounded-md bg-ru-blue-100" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-ru-n-700">
                {row.name}
              </span>
              <span className={`block text-[11px] ${row.tone}`}>{row.meta}</span>
            </span>
          </div>
        ))}
        <div style={rowDelay(3)} className={`flex flex-wrap gap-1.5 pt-0.5 ${rowReveal(shown)}`}>
          {["WhatsApp", "Instagram", "Facebook"].map((channel) => (
            <span
              key={channel}
              className="rounded-full border border-ru-green-100 bg-ru-green-50 px-2 py-0.5 text-[10.5px] font-semibold text-ru-green-700"
            >
              {channel} · Synced
            </span>
          ))}
        </div>
      </div>
    </Inset>
  );
}

/** The delivery choice and savings a WhatsApp checkout collects before the payment link. */
export function CheckoutMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const rows = [
    { left: "Standard · 3–5 days", right: "$6.00", on: true },
    { left: "Express · 1–2 days", right: "$14.00", on: false },
    { left: "Coupon WELCOME10", right: "−$8.00", on: false },
  ];

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <div
            key={row.left}
            style={rowDelay(i)}
            className={`flex items-center justify-between gap-3 rounded-lg border px-2.75 py-2 ${rowReveal(shown)} ${
              row.on ? "border-ru-blue-200 bg-ru-blue-50" : "border-ru-n-200 bg-white"
            }`}
          >
            <span
              className={`min-w-0 truncate text-[12.5px] ${row.on ? "font-semibold text-ru-blue-700" : "text-ru-n-700"}`}
            >
              {row.left}
            </span>
            <span className="flex-none text-[11.5px] text-ru-n-500 tabular-nums">{row.right}</span>
          </div>
        ))}
        <div
          style={rowDelay(3)}
          className={`rounded-lg bg-ru-blue-600 py-2 text-center text-[12.5px] font-semibold text-white ${rowReveal(shown)}`}
        >
          Pay $78.00
        </div>
      </div>
    </Inset>
  );
}

/** The link-in-bio storefront's grid, with a sold-out item taking back-in-stock requests. */
export function StorefrontMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const items = [
    { name: "Mug set", price: "$32.00", swatch: "bg-ru-amber-100", action: "Added" },
    { name: "Linen throw", price: "$68.00", swatch: "bg-ru-green-100", action: "Add" },
    { name: "Diffuser", price: "$24.00", swatch: "bg-ru-blue-100", action: "Add" },
    { name: "Candle tin", price: "Sold out", swatch: "bg-ru-n-100", action: "Notify me" },
  ];

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="grid grid-cols-2 gap-1.5">
        {items.map((item, i) => (
          <div
            key={item.name}
            style={rowDelay(i)}
            className={`flex flex-col gap-1 rounded-lg border border-ru-n-200 bg-white p-1.5 ${rowReveal(shown)}`}
          >
            <span className={`h-8 rounded-md ${item.swatch}`} />
            <span className="truncate text-[11.5px] font-medium text-ru-n-700">{item.name}</span>
            <span className="flex items-center justify-between gap-1">
              <span className="text-[10.5px] text-ru-n-400">{item.price}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  item.action === "Added"
                    ? "bg-ru-blue-600 text-white"
                    : "border border-ru-n-200 text-ru-n-600"
                }`}
              >
                {item.action}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Inset>
  );
}

/** The coupon kinds a shop can create. */
export function CouponMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const coupons = [
    { code: "AUTUMN15", rule: "15% off candles" },
    { code: "SHIPFREE", rule: "Free shipping over $50" },
    { code: "MUG2", rule: "Buy 2 mugs, get 1 free" },
    { code: "WELCOME10", rule: "$10 off a first order" },
    { code: "VIP20", rule: "20% off · loyalty members" },
  ];

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {coupons.map((coupon, i) => (
          <div
            key={coupon.code}
            style={rowDelay(i)}
            className={`flex items-center gap-2.5 ${ROW} ${rowReveal(shown)}`}
          >
            <span className="flex-none rounded border border-dashed border-ru-amber-300 bg-ru-amber-50 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-ru-amber-700">
              {coupon.code}
            </span>
            <span className="min-w-0 truncate text-[12px] text-ru-n-600">{coupon.rule}</span>
          </div>
        ))}
      </div>
    </Inset>
  );
}

export function RecoveryMini() {
  return (
    <RowsMini
      items={[
        { key: "cart", left: "Cart reminder · Omar H.", right: "Reminder sent" },
        { key: "pay", left: "Payment reminder · #1041", right: "Link resent" },
        { key: "stock", left: "Back in stock · Candle tin", right: "14 waiting" },
        { key: "review", left: "Review request · #1035", right: "After delivery" },
      ]}
    />
  );
}

export function PointsMini() {
  return (
    <RowsMini
      items={[
        { key: "balance", left: "Maya C. · Gold member", right: "840 points" },
        { key: "spend", left: "Redeemed at checkout", right: "−400 · $4.00 off" },
        { key: "earn", left: "Earned on order #1042", right: "+82 points" },
      ]}
    />
  );
}

const BUBBLE_IN =
  "max-w-[88%] self-start rounded-[12px_12px_12px_4px] border border-ru-n-200 bg-white px-2.75 py-2 text-[12.5px]/[1.45] text-ru-n-600";
const BUBBLE_OUT =
  "max-w-[88%] self-end rounded-[12px_12px_4px_12px] bg-ru-blue-600 px-2.75 py-2 text-[12.5px]/[1.45] text-white";
const TOOL =
  "self-center rounded-full border border-ru-n-200 bg-white px-2.5 py-1 font-mono text-[10.5px] text-ru-n-500";

/** The Meta AI agent calling RateUp's shop tools mid-conversation. */
export function AgentShopMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const lines = [
    { cls: BUBBLE_IN, text: "Do you have the linen throw in green?" },
    { cls: TOOL, text: "search_products → 1 match" },
    { cls: BUBBLE_OUT, text: "Yes — Linen throw, Sage, $68. Want me to start your order?" },
    { cls: TOOL, text: "start_checkout → payment link" },
  ];

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {lines.map((line, i) => (
          <div key={line.text} style={rowDelay(i)} className={`${line.cls} ${rowReveal(shown)}`}>
            {line.text}
          </div>
        ))}
      </div>
    </Inset>
  );
}

/** The inbox composer's shop actions. */
export function InboxShopMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();
  const actions = ["Send products", "Create order", "Send payment link"];

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        <div style={rowDelay(0)} className={`${BUBBLE_IN} ${rowReveal(shown)}`}>
          Can you put the mug set aside for me? I'll pay now.
        </div>
        <div style={rowDelay(1)} className={`flex flex-wrap gap-1.5 pt-0.5 ${rowReveal(shown)}`}>
          {actions.map((action, i) => (
            <span
              key={action}
              className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${
                i === 2
                  ? "border-ru-blue-600 bg-ru-blue-600 text-white"
                  : "border-ru-n-200 bg-white text-ru-n-600"
              }`}
            >
              {action}
            </span>
          ))}
        </div>
      </div>
    </Inset>
  );
}

export function AttributionMini() {
  return (
    <RowsMini
      items={[
        { key: "1042", left: "#1042 · Maya C. · $82.00", right: "Ad · Autumn candles" },
        { key: "1039", left: "#1039 · Daniel O. · $210.00", right: "Ad · Gift guide" },
        { key: "1035", left: "#1035 · Aiko T. · $188.00", right: "Ad · Autumn candles" },
      ]}
    />
  );
}
