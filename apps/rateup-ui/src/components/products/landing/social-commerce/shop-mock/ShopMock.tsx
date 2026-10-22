import type { ReactNode } from "react";

import PhoneFrame, { PHONE_IN, PHONE_OUT, PHONE_SYSTEM, Typing } from "../../shared/PhoneFrame";
import { useScript } from "../../shared/useScript";
import { SHOP_SCRIPT, type Msg, type OrderStatus, type ShopState } from "./script";

const PRODUCTS = [
  { name: "Cedar & Smoke candle", price: "$24.00", swatch: "bg-ru-blue-100" },
  { name: "Stoneware mug set", price: "$32.00", swatch: "bg-ru-amber-100" },
  { name: "Amber reed diffuser", price: "$24.00", swatch: "bg-ru-green-100" },
] as const;

/** A WhatsApp interactive message's button row, under a hairline. */
function ChatButton({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="mt-2 -mb-1 block border-t border-ru-n-100 pt-2 text-center text-[13px] font-semibold text-ru-blue-600">
      {children}
    </span>
  );
}

function Row({ left, right, strong }: Readonly<{ left: string; right: string; strong?: boolean }>) {
  return (
    <span
      className={`flex justify-between gap-3 text-[12.5px] ${strong ? "font-semibold text-ru-n-700" : "text-ru-n-500"}`}
    >
      <span>{left}</span>
      <span className="tabular-nums">{right}</span>
    </span>
  );
}

function Message({ msg }: Readonly<{ msg: Msg }>) {
  switch (msg.kind) {
    case "out":
      return <div className={PHONE_OUT}>{msg.text}</div>;
    case "in":
      return <div className={PHONE_IN}>{msg.text}</div>;
    case "system":
      return <div className={PHONE_SYSTEM}>{msg.text}</div>;
    case "products":
      return (
        <div className={`${PHONE_IN} w-[88%]`}>
          <span className="mb-1.5 block text-[13px] font-semibold text-ru-n-700">
            Gifts under $40
          </span>
          <span className="flex flex-col gap-1.5">
            {PRODUCTS.map((product) => (
              <span key={product.name} className="flex items-center gap-2.5">
                <span className={`size-8 flex-none rounded-md ${product.swatch}`} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ru-n-700">
                  {product.name}
                </span>
                <span className="text-[12px] text-ru-n-500 tabular-nums">{product.price}</span>
              </span>
            ))}
          </span>
          <ChatButton>View items</ChatButton>
        </div>
      );
    case "cart":
      return (
        <div className={PHONE_OUT}>
          <span className="flex items-center gap-2.5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5 flex-none"
              aria-hidden="true"
            >
              <path d="M3 4h2l2.4 11h10.2L20 8H6.2" />
              <circle cx="9" cy="19" r="1.3" />
              <circle cx="17" cy="19" r="1.3" />
            </svg>
            <span>
              <span className="block font-semibold">3 items</span>
              <span className="text-[12.5px] text-white/75">$80.00 · View sent cart</span>
            </span>
          </span>
        </div>
      );
    case "points":
      return (
        <div className={PHONE_IN}>
          You have <b className="font-semibold text-ru-n-700">840 points</b>. Use 400 points for $4
          off this order?
          <ChatButton>Yes, use 400 points</ChatButton>
        </div>
      );
    case "order":
      return (
        <div className={`${PHONE_IN} w-[80%]`}>
          <span className="mb-1.5 block text-[13px] font-semibold text-ru-n-700">Order #1042</span>
          <span className="flex flex-col gap-0.5">
            <Row left="Subtotal" right="$80.00" />
            <Row left="Points" right="−$4.00" />
            <Row left="Shipping" right="$6.00" />
            <Row left="Total" right="$82.00" strong />
          </span>
          <ChatButton>Pay $82.00</ChatButton>
        </div>
      );
    case "tracking":
      return (
        <div className={PHONE_IN}>
          Your order is on its way — expected Oct 21.
          <ChatButton>Track parcel</ChatButton>
        </div>
      );
  }
}

const STATUS_TONE: Record<OrderStatus, string> = {
  "Cart received": "border-ru-n-200 bg-ru-n-50 text-ru-n-600",
  "Awaiting payment": "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-700",
  "Paid · Stripe": "border-ru-green-100 bg-ru-green-50 text-ru-green-700",
  Shipped: "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-700",
};

function OrderPanel({ state }: Readonly<{ state: ShopState }>) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-ru-n-200 bg-white p-5 text-left shadow-[0_24px_64px_rgba(16,24,40,0.08)]">
      <div className="text-[11px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
        In RateUp · Orders
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-ru-n-200 px-3.5 py-3">
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-ru-n-700">#1042 · Maya Chen</span>
          <span className="text-[12.5px] text-ru-n-400">WhatsApp · +1 555 0142</span>
        </span>
        {state.status && (
          <span
            key={state.status}
            className={`flex-none animate-ru-msg-in rounded-full border px-2.5 py-1 text-[12px] font-semibold motion-reduce:animate-none ${STATUS_TONE[state.status]}`}
          >
            {state.status}
          </span>
        )}
      </div>

      <div className="mt-2 text-[11px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
        Timeline
      </div>
      <div className="flex min-h-66 flex-col gap-2">
        {state.events.map((event) => (
          <div
            key={event.id}
            className="flex animate-ru-msg-in items-center justify-between gap-3 rounded-lg border border-ru-n-200 bg-ru-n-50 px-3 py-2.25 motion-reduce:animate-none"
          >
            <span className="min-w-0 truncate text-[13px] font-medium text-ru-n-700">
              {event.label}
            </span>
            <span className="flex-none text-[12px] text-ru-n-500 tabular-nums">{event.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A WhatsApp sale from question to tracking, with the order it writes beside it. */
export default function ShopMock() {
  const [ref, state] = useScript(SHOP_SCRIPT);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="A WhatsApp chat in which a customer asks for a gift, gets product cards, sends a cart, shares an address, uses 400 loyalty points and pays a payment link, then receives tracking — while the RateUp Orders list records each step of order #1042."
      className="grid items-center gap-6 select-none lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10"
    >
      <div aria-hidden="true">
        <PhoneFrame initial="J" name="Juniper & Co.">
          {state.messages.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}
          {state.typing && <Typing />}
        </PhoneFrame>
      </div>
      <div aria-hidden="true" className="mx-auto w-full max-w-110">
        <OrderPanel state={state} />
      </div>
    </div>
  );
}
