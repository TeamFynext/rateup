import connection from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";

/**
 * Answers collected so far for one in-flight flow run.
 *
 * A multi-screen flow posts one `data_exchange` per screen carrying only that
 * screen's fields, so the answers have to accumulate somewhere until the flow
 * ends. This used to be a durable database row per phone. The data is
 * short-lived (a flow is open for minutes) and worthless once the run finishes,
 * so it lives in Redis keyed by the flow token instead.
 *
 * Keyed by token rather than by phone, so one person can have two flows open at
 * once — which the one-row-per-`(phone, orgId)` session could never represent.
 *
 * Tokens themselves never expire, so a run whose in-progress answers have aged
 * out simply starts collecting again from the screen the respondent is on.
 * Nothing here needs to remember that a run finished: WhatsApp disables a flow
 * message's button once it has been submitted, so the respondent can only view
 * what they sent.
 */

/** In-progress answers. A flow is open for minutes; this is a safety net, not storage. */
const RESPONSES_TTL_SECONDS = 24 * 60 * 60;

function key(flowToken: string) {
  return `flow_responses:${flowToken}`;
}

/** Appends this screen's answers and returns everything collected so far. */
export async function appendFlowResponses<T>(flowToken: string, responses: T[]): Promise<T[]> {
  const redisKey = key(flowToken);
  const existing = await getFlowResponses<T>(flowToken);
  const merged = [...existing, ...responses];
  // Rewrite rather than RPUSH: a screen the respondent navigates back to
  // re-posts its fields, and the callers de-duplicate the merged list.
  await connection.set(redisKey, JSON.stringify(merged), "EX", RESPONSES_TTL_SECONDS);
  return merged;
}

export async function getFlowResponses<T>(flowToken: string): Promise<T[]> {
  const raw = await connection.get(key(flowToken));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (e) {
    log.warn({ err: e }, "Discarding unreadable flow response state");
    return [];
  }
}

export async function clearFlowResponses(flowToken: string) {
  await connection.del(key(flowToken));
}
