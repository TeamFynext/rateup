import connection from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";

/**
 * Where one contact currently is in a WhatsApp automation.
 *
 * This used to be derived from the `WaAutomatedReplyMessage` log: "the newest row
 * for this phone" was the contact's position. That table is an append-only log
 * (one row per step, kept for the automation's activity view and the pause
 * worker), so answering a button tap meant an ORDER BY over a table that only
 * grows. The position itself is one small, short-lived value per contact, so it
 * lives in Redis; the log rows are still written as before.
 *
 * Keyed by org + phone, not by automation: a contact is only ever "in" the
 * automation that most recently logged a step for them, which is what the old
 * newest-row lookup returned too.
 */
export interface AutomationPosition {
  automationId: string;
  currentNode: string;
  /** The log row the position came from; `null` when that write failed. */
  logId: string | null;
  /** When a step was last logged. The lookup's time windows measure from this. */
  loggedAt: number;
}

/**
 * Longest a position is kept. Button taps and text replies only look back 24h and
 * 4h; a WhatsApp Flow can be submitted later than that, so this is the bound on
 * how late a Flow submission may still continue its automation.
 */
export const POSITION_TTL_SECONDS = 7 * 24 * 60 * 60;

function key(orgId: string, phone: string) {
  return `wa_automation_position:${orgId}:${phone}`;
}

export async function getAutomationPosition(
  orgId: string,
  phone: string,
): Promise<AutomationPosition | null> {
  try {
    const raw = await connection.get(key(orgId, phone));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AutomationPosition>;
    if (
      typeof parsed?.automationId !== "string" ||
      typeof parsed.currentNode !== "string" ||
      typeof parsed.loggedAt !== "number"
    ) {
      return null;
    }
    return {
      automationId: parsed.automationId,
      currentNode: parsed.currentNode,
      logId: typeof parsed.logId === "string" ? parsed.logId : null,
      loggedAt: parsed.loggedAt,
    };
  } catch (e) {
    log.warn({ err: e }, "Discarding unreadable automation position");
    return null;
  }
}

/** Records a newly logged step: the contact is now at `currentNode` of `automationId`. */
export async function setAutomationPosition(
  orgId: string,
  phone: string,
  position: Omit<AutomationPosition, "loggedAt">,
) {
  try {
    const value: AutomationPosition = { ...position, loggedAt: Date.now() };
    await connection.set(key(orgId, phone), JSON.stringify(value), "EX", POSITION_TTL_SECONDS);
  } catch (e) {
    log.error({ err: e }, "Failed to record automation position");
  }
}

/**
 * Advances the contact within an automation without logging a step.
 *
 * Only moves a position that belongs to `automationId`: the log-based version
 * rewrote that automation's rows, which changed nothing when the contact's newest
 * row was from another automation. `loggedAt` and the TTL are kept, so advancing
 * does not extend how long the position is honoured.
 */
export async function moveAutomationPosition(
  orgId: string,
  phone: string,
  automationId: string,
  currentNode: string,
) {
  try {
    const current = await getAutomationPosition(orgId, phone);
    if (!current || current.automationId !== automationId) return;
    await connection.set(key(orgId, phone), JSON.stringify({ ...current, currentNode }), "KEEPTTL");
  } catch (e) {
    log.error({ err: e }, "Failed to advance automation position");
  }
}
