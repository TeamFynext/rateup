import type { Channel } from "@/components/RateupHomePage/shared/mockups/kit";

import type { Script, ScriptStep } from "../../shared/useScript";

export interface Msg {
  id: string;
  kind: "in" | "out" | "auto" | "note" | "system";
  text: string;
  at?: string;
}

export interface Row {
  id: string;
  initials: string;
  tone: string;
  name: string;
  channel: Channel;
  number: number;
  subject: string;
  preview: string;
  at: string;
  status: "New" | "Open" | "Closed";
  unread?: number;
  assignee?: string;
  selected?: boolean;
}

export interface MockState {
  step: number;
  messages: readonly Msg[];
  rows: readonly Row[];
  typing: "agent" | "customer" | null;
  newCount: number;
  closed: boolean;
}

const ROWS: readonly Row[] = [
  {
    id: "meera",
    initials: "MN",
    tone: "bg-ru-green-600",
    name: "Meera N.",
    channel: "whatsapp",
    number: 2041,
    subject: "Order #8823 not confirmed",
    preview: "I placed the order yesterday but got no…",
    at: "2m",
    status: "Open",
    unread: 2,
    assignee: "RK",
    selected: true,
  },
  {
    id: "dev",
    initials: "DR",
    tone: "bg-ru-blue-400",
    name: "Dev R.",
    channel: "whatsapp",
    number: 2039,
    subject: "Delivery before Friday?",
    preview: "Can you deliver it before Friday?",
    at: "18m",
    status: "New",
  },
  {
    id: "aisha",
    initials: "AK",
    tone: "bg-ru-amber-600",
    name: "Aisha K.",
    channel: "instagram",
    number: 2036,
    subject: "Festive collection",
    preview: "Is the green one still available?",
    at: "1h",
    status: "New",
    unread: 1,
    assignee: "FA",
  },
  {
    id: "nikhil",
    initials: "NP",
    tone: "bg-ru-blue-600",
    name: "Nikhil P.",
    channel: "messenger",
    number: 2030,
    subject: "Warranty question",
    preview: "Thanks — that clears it up.",
    at: "3h",
    status: "Closed",
    assignee: "FA",
  },
];

const ARRIVAL: Row = {
  id: "sara",
  initials: "SM",
  tone: "bg-ru-blue-500",
  name: "Sara M.",
  channel: "instagram",
  number: 2042,
  subject: "Sizing",
  preview: "Is the medium true to fit?",
  at: "now",
  status: "New",
  unread: 1,
};

const THREAD: readonly Msg[] = [
  {
    id: "m1",
    kind: "in",
    text: "I placed order #8823 yesterday but got no confirmation. Could you check?",
    at: "10:41",
  },
  {
    id: "m2",
    kind: "auto",
    text: "Thanks Meera — we've got your message. Someone from Orders will reply shortly.",
  },
  {
    id: "m3",
    kind: "out",
    text: "Hi Meera — found it. #8823 was paid and left the warehouse this morning.",
    at: "10:43",
  },
  { id: "m4", kind: "in", text: "Oh perfect, thank you! That was quick.", at: "10:43" },
  { id: "m5", kind: "note", text: "@Fatima tracking is live now — safe to share the link." },
  {
    id: "m6",
    kind: "out",
    text: "Here's your tracking link. It should reach you by 6 PM today.",
    at: "10:45",
  },
  { id: "m7", kind: "system", text: "Ticket #2041 closed · Resolved" },
];

/* The thread pane has a fixed height, so it only ever holds the tail of the conversation. */
const VISIBLE = 4;
const say = (upTo: number): readonly Msg[] => THREAD.slice(0, upTo).slice(-VISIBLE);

const onMeera = (rows: readonly Row[], change: (row: Row) => Row): readonly Row[] =>
  rows.map((row) => (row.id === "meera" ? change(row) : row));
const read = (row: Row): Row => ({ ...row, unread: undefined });
const close = (row: Row): Row => ({ ...row, status: "Closed", unread: undefined });

const INITIAL: MockState = {
  step: 0,
  messages: THREAD.slice(0, 2),
  rows: ROWS,
  typing: null,
  newCount: 7,
  closed: false,
};

const FINAL: MockState = {
  step: 0,
  messages: THREAD.slice(-VISIBLE),
  rows: onMeera([ROWS[0], ARRIVAL, ...ROWS.slice(1)], close),
  typing: null,
  newCount: 8,
  closed: true,
};

const STEPS: readonly ScriptStep<MockState>[] = [
  { delay: 1500, apply: (s) => ({ ...s, typing: "agent" }) },
  { delay: 1900, apply: (s) => ({ ...s, typing: null, messages: say(3) }) },
  { delay: 1700, apply: (s) => ({ ...s, typing: "customer" }) },
  {
    delay: 1700,
    apply: (s) => ({
      ...s,
      typing: null,
      messages: say(4),
      rows: onMeera(s.rows, read),
    }),
  },
  {
    delay: 2000,
    apply: (s) => ({
      ...s,
      rows: [s.rows[0], ARRIVAL, ...s.rows.slice(1)],
      newCount: s.newCount + 1,
    }),
  },
  { delay: 1900, apply: (s) => ({ ...s, messages: say(5) }) },
  { delay: 1500, apply: (s) => ({ ...s, typing: "agent" }) },
  { delay: 1800, apply: (s) => ({ ...s, typing: null, messages: say(6) }) },
  {
    delay: 2200,
    apply: (s) => ({
      ...s,
      messages: say(7),
      closed: true,
      rows: onMeera(s.rows, close),
    }),
  },
  { delay: 4200, apply: () => INITIAL },
];

export const INBOX_SCRIPT: Script<MockState> = { initial: INITIAL, final: FINAL, steps: STEPS };
