import axios from "@/config/axios";

/**
 * The Meta Business Agent (Meta AI on a WhatsApp number). Mirrors rateup-api's
 * `src/modules/metaAgent/metaAgent.route.ts` and rateup-ui's `metaAgent.api.ts`; the app
 * only reads usage and hands conversations back, setting the agent up stays on the web.
 * Every call here waits on Meta, so they get a longer timeout than the default.
 */

const SLOW = { timeout: 30_000 };
const base = (waSettingsId: string) => `/api/meta-agent/${waSettingsId}`;

export interface MetaBusinessAgent {
  id: string;
  whatsappSettingsId: string;
  agentId?: string | null;
  status: "NOT_ONBOARDED" | "ONBOARDED" | "DISABLED";
}

/** The agent row for a number, or null when the number has never had one. */
export async function getMetaBusinessAgent(waSettingsId: string) {
  const res = await axios.get<MetaBusinessAgent | null | "">(base(waSettingsId), SLOW);
  return res.data || null;
}

/** `release` hands the conversation back to Meta AI. `to` is the customer's number. */
export async function setThreadControl(
  waSettingsId: string,
  action: "pass" | "release",
  to: string,
) {
  const res = await axios.post(`${base(waSettingsId)}/thread-control`, { action, to }, SLOW);
  return res.data as { messaging_product: string };
}

export interface ConversationInsights {
  /** Conversations the agent replied in during the range. */
  ai_threads?: { count: number };
  /** Handed to the team and awaiting a reply right now, whatever the range. */
  ai_handoffs?: { count: number };
}

export interface InsightsRange {
  /** YYYY-MM-DD, both inclusive. */
  start_date: string;
  end_date: string;
}

export async function getConversationInsights(waSettingsId: string, range: InsightsRange) {
  const res = await axios.get<{ data: ConversationInsights[] }>(
    `${base(waSettingsId)}/insights/conversations`,
    { ...SLOW, params: range },
  );
  return res.data;
}

export type BudgetUnitType = "token" | "ai_turn";
export type BudgetTimeWindow = "one_day" | "seven_days" | "fourteen_days" | "thirty_days";

export interface AgentBudget {
  budget_id?: string;
  unit_type: BudgetUnitType;
  time_window: BudgetTimeWindow;
  max_budget: number;
}

export async function getAgentBudgets(waSettingsId: string) {
  const res = await axios.get<{ budgets: AgentBudget[]; budgetsSyncedAt?: string | null }>(
    `${base(waSettingsId)}/budget`,
    SLOW,
  );
  return res.data;
}
