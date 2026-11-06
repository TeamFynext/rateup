import type { Script, ScriptStep } from "../../shared/useScript";

export interface Msg {
  id: string;
  /** `out` is the customer; `ai` and `staff` are the business side. */
  kind: "out" | "ai" | "staff" | "tool" | "system";
  text: string;
}

export interface AgentState {
  step: number;
  messages: readonly Msg[];
  typing: boolean;
  owner: "ai" | "staff";
  /** The steps Insights shows for this customer's turns, as Meta reports them. */
  turns: readonly { id: string; label: string; detail: string }[];
}

const THREAD: readonly Msg[] = [
  { id: "c1", kind: "out", text: "Hi! Do you deliver to Whitefield?" },
  {
    id: "a1",
    kind: "ai",
    text: "Yes — we deliver across Bengaluru, usually within 2 days. Orders over ₹999 ship free.",
  },
  { id: "c2", kind: "out", text: "Nice. How many points do I have?" },
  { id: "t1", kind: "tool", text: "get_loyalty_status" },
  {
    id: "a2",
    kind: "ai",
    text: "You have 1,240 points — enough for a free coffee on your next visit.",
  },
  { id: "c3", kind: "out", text: "Can I talk to someone about a bulk order for our office?" },
  { id: "a3", kind: "ai", text: "Let me get a colleague to help with that — one moment." },
  { id: "s1", kind: "system", text: "Handed over to your team" },
  { id: "h1", kind: "staff", text: "Hi, Rohan from sales here — how many people is it for?" },
];

const say = (upTo: number) => THREAD.slice(0, upTo);

const MODEL_1 = { id: "m1", label: "Model", detail: "Worked · 1.4 s" };
const TOOL = { id: "t1", label: "Tool: get_loyalty_status", detail: "Worked · 320 ms" };
const MODEL_2 = { id: "m2", label: "Model", detail: "Worked · 1.1 s" };

const INITIAL: AgentState = {
  step: 0,
  messages: say(1),
  typing: false,
  owner: "ai",
  turns: [],
};

const STEPS: readonly ScriptStep<AgentState>[] = [
  { delay: 1200, apply: (s) => ({ ...s, typing: true }) },
  {
    delay: 1500,
    apply: (s) => ({ ...s, typing: false, messages: say(2), turns: [MODEL_1] }),
  },
  { delay: 2200, apply: (s) => ({ ...s, messages: say(3) }) },
  {
    delay: 1300,
    apply: (s) => ({ ...s, messages: say(4), turns: [...s.turns, TOOL] }),
  },
  { delay: 1400, apply: (s) => ({ ...s, messages: say(5), turns: [...s.turns, MODEL_2] }) },
  { delay: 2400, apply: (s) => ({ ...s, messages: say(6) }) },
  { delay: 1500, apply: (s) => ({ ...s, messages: say(7) }) },
  {
    delay: 1200,
    apply: (s) => ({ ...s, messages: say(8), owner: "staff" }),
  },
  { delay: 1900, apply: (s) => ({ ...s, messages: say(9) }) },
  { delay: 4200, apply: () => INITIAL },
];

export const AGENT_SCRIPT: Script<AgentState> = {
  initial: INITIAL,
  final: {
    step: 0,
    messages: THREAD,
    typing: false,
    owner: "staff",
    turns: [MODEL_1, TOOL, MODEL_2],
  },
  steps: STEPS,
};
