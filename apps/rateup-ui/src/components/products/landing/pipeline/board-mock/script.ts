import type { Script, ScriptStep } from "../../shared/useScript";

export type Source = "whatsapp" | "instagram" | "messenger" | "referral";

export interface Card {
  id: string;
  name: string;
  company: string;
  initials: string;
  tone: string;
  source: Source;
  /** The next-activity strip; `null` reads "No next activity scheduled". */
  next: string | null;
  days: number;
  idle?: boolean;
  won?: boolean;
  assignees: readonly string[];
  label?: string;
}

export type StageId = "new" | "contacted" | "qualified" | "proposal" | "won";

export interface BoardState {
  step: number;
  columns: Readonly<Record<StageId, readonly Card[]>>;
  toast: string | null;
}

export const STAGES: ReadonlyArray<{ id: StageId; name: string; dot: string }> = [
  { id: "new", name: "New Lead", dot: "bg-ru-green-600" },
  { id: "contacted", name: "Contacted", dot: "bg-ru-green-500" },
  { id: "qualified", name: "Qualified", dot: "bg-ru-amber-400" },
  { id: "proposal", name: "Demo / Proposal", dot: "bg-ru-amber-600" },
  { id: "won", name: "Won", dot: "bg-ru-blue-600" },
];

const MEERA: Card = {
  id: "meera",
  name: "Meera N.",
  company: "Bloomfield Interiors",
  initials: "MN",
  tone: "bg-ru-green-600",
  source: "whatsapp",
  next: null,
  days: 0,
  assignees: ["RK"],
};

const KABIR: Card = {
  id: "kabir",
  name: "Kabir M.",
  company: "Northline Clinics",
  initials: "KM",
  tone: "bg-ru-amber-600",
  source: "referral",
  next: null,
  days: 6,
  idle: true,
  assignees: ["SN"],
};

const RHEA: Card = {
  id: "rhea",
  name: "Rhea T.",
  company: "Tealeaf Cafés",
  initials: "RT",
  tone: "bg-ru-blue-500",
  source: "whatsapp",
  next: "Demo · Thu 4:00 PM",
  days: 3,
  assignees: ["FA", "RK"],
  label: "Multi-outlet",
};

const INITIAL_COLUMNS: BoardState["columns"] = {
  new: [
    {
      id: "dev",
      name: "Dev R.",
      company: "Direct customer",
      initials: "DR",
      tone: "bg-ru-blue-400",
      source: "instagram",
      next: "Message · Send price list",
      days: 1,
      assignees: ["FA"],
    },
  ],
  contacted: [
    {
      id: "ananya",
      name: "Ananya I.",
      company: "Studio Nine",
      initials: "AI",
      tone: "bg-ru-green-500",
      source: "messenger",
      next: "Call · Tomorrow 11:00 AM",
      days: 2,
      assignees: ["RK"],
    },
  ],
  qualified: [KABIR],
  proposal: [RHEA],
  won: [
    {
      id: "neha",
      name: "Neha P.",
      company: "Urban Pantry",
      initials: "NP",
      tone: "bg-ru-blue-600",
      source: "whatsapp",
      next: null,
      days: 0,
      won: true,
      assignees: ["SN"],
    },
  ],
};

type Columns = BoardState["columns"];

const without = (cards: readonly Card[], id: string) => cards.filter((card) => card.id !== id);

function move(columns: Columns, id: string, from: StageId, to: StageId, change?: Partial<Card>) {
  const card = columns[from].find((c) => c.id === id);
  if (!card) return columns;
  return {
    ...columns,
    [from]: without(columns[from], id),
    [to]: [{ ...card, days: 0, idle: false, ...change }, ...columns[to]],
  };
}

function edit(columns: Columns, stage: StageId, id: string, change: Partial<Card>): Columns {
  return {
    ...columns,
    [stage]: columns[stage].map((card) => (card.id === id ? { ...card, ...change } : card)),
  };
}

const INITIAL: BoardState = { step: 0, columns: INITIAL_COLUMNS, toast: null };

const STEPS: readonly ScriptStep<BoardState>[] = [
  {
    delay: 1400,
    apply: (s) => ({
      ...s,
      toast: "Meera N. added from the inbox",
      columns: { ...s.columns, new: [MEERA, ...s.columns.new] },
    }),
  },
  {
    delay: 1900,
    apply: (s) => ({
      ...s,
      toast: null,
      columns: edit(s.columns, "new", "meera", { next: "Call · Today 5:00 PM" }),
    }),
  },
  {
    delay: 1800,
    apply: (s) => ({ ...s, columns: move(s.columns, "meera", "new", "contacted") }),
  },
  {
    delay: 1900,
    apply: (s) => ({
      ...s,
      toast: "Note added on Kabir M.",
      columns: edit(s.columns, "qualified", "kabir", { idle: false }),
    }),
  },
  {
    delay: 2000,
    apply: (s) => ({
      ...s,
      toast: "Rhea T. closed as Won",
      columns: move(s.columns, "rhea", "proposal", "won", { won: true, next: null }),
    }),
  },
  {
    delay: 2000,
    apply: (s) => ({
      ...s,
      toast: null,
      columns: move(s.columns, "meera", "contacted", "qualified"),
    }),
  },
  { delay: 4200, apply: () => INITIAL },
];

/** The story played to its end, without the transient toast. */
const FINAL: BoardState = STEPS.slice(0, -1).reduce<BoardState>(
  (state, step) => step.apply(state),
  INITIAL,
);

export const BOARD_SCRIPT: Script<BoardState> = {
  initial: INITIAL,
  final: { ...FINAL, step: 0, toast: null },
  steps: STEPS,
};
