import type { Script, ScriptStep } from "../../shared/useScript";

export type Msg =
  | { id: string; kind: "out" | "in" | "system"; text: string }
  | { id: string; kind: "products" }
  | { id: string; kind: "cart" }
  | { id: string; kind: "points" }
  | { id: string; kind: "order" }
  | { id: string; kind: "tracking" };

export type OrderStatus = "Cart received" | "Awaiting payment" | "Paid · Stripe" | "Shipped";

export interface ShopState {
  step: number;
  messages: readonly Msg[];
  typing: boolean;
  status: OrderStatus | null;
  events: readonly { id: string; label: string; detail: string }[];
}

const THREAD: readonly Msg[] = [
  { id: "c1", kind: "out", text: "Looking for a gift under $40" },
  { id: "b1", kind: "products" },
  { id: "c2", kind: "cart" },
  { id: "s1", kind: "system", text: "Address shared · Standard delivery" },
  { id: "b2", kind: "points" },
  { id: "c3", kind: "out", text: "Yes, use 400 points" },
  { id: "b3", kind: "order" },
  { id: "s2", kind: "system", text: "Payment received · Order #1042" },
  { id: "b4", kind: "tracking" },
];

const say = (upTo: number) => THREAD.slice(0, upTo);

const CART = { id: "e1", label: "Cart received", detail: "3 items · $80.00" };
const ADDRESS = { id: "e2", label: "Address · Standard", detail: "+$6.00" };
const POINTS = { id: "e3", label: "400 points redeemed", detail: "−$4.00" };
const LINK = { id: "e4", label: "Payment link sent", detail: "$82.00" };
const PAID = { id: "e5", label: "Paid · Stripe", detail: "10:24" };
const SHIPPED = { id: "e6", label: "Tracking sent", detail: "EasyPost" };

const INITIAL: ShopState = { step: 0, messages: say(1), typing: false, status: null, events: [] };

const STEPS: readonly ScriptStep<ShopState>[] = [
  { delay: 1100, apply: (s) => ({ ...s, typing: true }) },
  { delay: 1300, apply: (s) => ({ ...s, typing: false, messages: say(2) }) },
  {
    delay: 2400,
    apply: (s) => ({ ...s, messages: say(3), status: "Cart received", events: [CART] }),
  },
  { delay: 1800, apply: (s) => ({ ...s, messages: say(4), events: [...s.events, ADDRESS] }) },
  { delay: 1300, apply: (s) => ({ ...s, messages: say(5) }) },
  { delay: 1900, apply: (s) => ({ ...s, messages: say(6), events: [...s.events, POINTS] }) },
  {
    delay: 1300,
    apply: (s) => ({
      ...s,
      messages: say(7),
      status: "Awaiting payment",
      events: [...s.events, LINK],
    }),
  },
  {
    delay: 2600,
    apply: (s) => ({
      ...s,
      messages: say(8),
      status: "Paid · Stripe",
      events: [...s.events, PAID],
    }),
  },
  {
    delay: 2000,
    apply: (s) => ({ ...s, messages: say(9), status: "Shipped", events: [...s.events, SHIPPED] }),
  },
  { delay: 4400, apply: () => INITIAL },
];

export const SHOP_SCRIPT: Script<ShopState> = {
  initial: INITIAL,
  final: {
    step: 0,
    messages: THREAD,
    typing: false,
    status: "Shipped",
    events: [CART, ADDRESS, POINTS, LINK, PAID, SHIPPED],
  },
  steps: STEPS,
};
