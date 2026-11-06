import type { AgentBudget } from "@/api/metaAgent/metaAgent.api";
import type { MetaAgentThreadOwner } from "@/api/inbox/types";

/**
 * Meta AI thread ownership, worded as rateup-ui's `MetaAgentThreadBadge` words it.
 *
 * Meta never says who holds a thread, only when it moves; the API pieces the owner together
 * (`metaAgent.threadOwner.ts`). Before any move has been seen the state is UNKNOWN for a
 * customer Meta AI has replied to, so a thread escalated before tracking began can still be
 * handed back; for everyone else there is no state at all.
 */
export type ThreadState = MetaAgentThreadOwner | "UNKNOWN";

export function threadState(
  row:
    | {
        metaAgentThreadOwner?: MetaAgentThreadOwner | null;
        metaAgentInvolved?: boolean;
      }
    | null
    | undefined,
): ThreadState | null {
  if (!row) return null;
  return row.metaAgentThreadOwner ?? (row.metaAgentInvolved ? "UNKNOWN" : null);
}

export const THREAD_STATES: Record<ThreadState, { label: string; title: string; body: string }> = {
  AI: {
    label: "Meta AI",
    title: "Meta AI is replying",
    body: "Meta AI answers this customer. Replying here takes the conversation over.",
  },
  STAFF: {
    label: "Staff",
    title: "Handed over to staff",
    body: "Meta AI has stopped answering. It stays silent until you hand the conversation back.",
  },
  UNKNOWN: {
    label: "AI agent",
    title: "Meta AI agent",
    body: "No handover has been seen for this customer yet. If Meta AI has stopped replying to them, hand the conversation back.",
  },
};

/** Meta's handover `metadata`, plus the reasons the API records itself. */
const REASON_LABELS: Record<string, string> = {
  customer_request: "The customer asked for a person",
  staff_reply: "A teammate replied from the inbox",
  released: "Handed back to Meta AI",
  ticket_closed: "Handed back when the ticket closed",
  automation: "An automation sent a message",
  campaign: "A campaign message was sent",
  api_send: "A message was sent through the API",
};

export const reasonLabel = (reason: string | null | undefined) =>
  reason ? (REASON_LABELS[reason] ?? reason) : null;

/** Whether the thread can be handed back from here: staff hold it, or nobody knows. */
export const canHandBack = (state: ThreadState | null, phone: string | null | undefined) =>
  (state === "STAFF" || state === "UNKNOWN") && !!digits(phone);

export const digits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

/**
 * The business number a thread runs through, for the per-number thread-control call: by
 * Meta's phone id first, then by the channel number, then the only number there is.
 */
export function findThreadNumber<T extends { id?: string; phone?: string; phoneId?: string }>(
  numbers: T[] | undefined,
  row: {
    metadata?: { phone_number_id?: string } | null;
    lastMessage?: { sourceIdentifier?: string | null } | null;
  },
): T | undefined {
  if (!numbers?.length) return undefined;
  const byPhoneId = row.metadata?.phone_number_id
    ? numbers.find((n) => n.phoneId === row.metadata?.phone_number_id)
    : undefined;
  if (byPhoneId) return byPhoneId;
  const channel = digits(row.lastMessage?.sourceIdentifier);
  const byChannel = channel ? numbers.find((n) => digits(n.phone) === channel) : undefined;
  if (byChannel) return byChannel;
  return numbers.length === 1 ? numbers[0] : undefined;
}

/**
 * A reply the Meta Business Agent wrote. Meta tags its sends with
 * `biz_opaque_callback_data: {"originator":"bizai"}`; same check as rateup-ui's.
 */
export function isMetaAiMessage(
  message: { messageBody?: { send?: unknown } | null } | null | undefined,
) {
  const send = message?.messageBody?.send;
  const tag =
    send && typeof send === "object" && "biz_opaque_callback_data" in send
      ? (send as { biz_opaque_callback_data?: unknown }).biz_opaque_callback_data
      : null;
  if (typeof tag !== "string" || !tag) return false;
  try {
    const parsed: unknown = JSON.parse(tag);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "originator" in parsed &&
      (parsed as { originator?: unknown }).originator === "bizai"
    );
  } catch {
    return false;
  }
}

const WINDOW_LABEL: Record<AgentBudget["time_window"], string> = {
  one_day: "a day",
  seven_days: "7 days",
  fourteen_days: "14 days",
  thirty_days: "30 days",
};

/** "50 AI replies per conversation, rolling 7 days". */
export function budgetText(budget: AgentBudget): string {
  const amount = budget.max_budget.toLocaleString("en-US");
  const what =
    budget.unit_type === "ai_turn"
      ? `${amount} AI replies per conversation`
      : `${amount} tokens across the business`;
  return `${what}, rolling ${WINDOW_LABEL[budget.time_window] ?? budget.time_window}`;
}
