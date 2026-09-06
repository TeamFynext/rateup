// A running count of the delivery receipts this worker has consumed.
//
// Verifying a campaign end to end means comparing two numbers: what the sender
// (Meta, or the meta-mock standing in for it) emitted, and what reached this
// consumer. Nothing here printed the second one — a batch logged its size and
// no more, so "did all 8485 `read`s arrive?" could only be answered by querying
// the database afterwards, which folds status counts into message rows and
// cannot tell a receipt that never arrived from one that arrived twice.
//
// So the tally counts both:
//
//   - **received** — every event off the topic, retries and redeliveries
//     included. This is Kafka's number.
//   - **unique** — distinct `messageId:status` pairs. This is the number to
//     compare against the sender, and the invariants below hold on it:
//
//         sent               === messages   (every send is acknowledged)
//         delivered + failed === sent       (a send goes one way or the other)
//         read      + failed === sent
//
// Distinctness needs a set of every pair seen, which is memory a long-lived
// production consumer should not be spending — hence off unless asked for, and
// capped even then.
import { log } from "../../shared/logger.js";

/** The statuses a WhatsApp send produces, in the order it produces them. */
const STATUSES = ["sent", "delivered", "read", "failed"] as const;

type Status = (typeof STATUSES)[number];

/**
 * How many `messageId:status` pairs to remember before giving up on
 * distinctness. Roughly 24 bytes of key per entry, so ~50MB at this size —
 * enough for a campaign an order of magnitude past the largest real one, and
 * bounded if someone leaves the tally on in a long-lived process.
 */
const MAX_TRACKED_PAIRS = 1_000_000;

export interface StatusTallyEvent {
  messageId?: string;
  status?: string;
}

export interface StatusTally {
  /** Fold one batch in and log the running totals. */
  record(
    events: StatusTallyEvent[],
    outcome?: { processed?: number; retried?: number; dlq?: number },
  ): void;
  /** The totals so far, for a test or a shutdown log. */
  snapshot(): StatusTallySnapshot;
  readonly enabled: boolean;
}

export interface StatusTallySnapshot {
  batches: number;
  events: number;
  messages: number;
  processed: number;
  retried: number;
  dlq: number;
  duplicates: number;
  other: number;
  received: Record<Status, number>;
  unique: Record<Status, number>;
  /** True once distinctness was abandoned — `unique` is a floor from then on. */
  saturated: boolean;
}

/**
 * On unless switched off outside production, since the whole point is to be
 * running when someone fires a campaign at the mock and wants to check the
 * arithmetic. `STATUS_TALLY=1` turns it on anywhere, `STATUS_TALLY=0` off.
 */
function tallyEnabled(): boolean {
  const flag = process.env.STATUS_TALLY;
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return (process.env.NODE_ENV || "development") !== "production";
}

const zeroed = (): Record<Status, number> => ({ sent: 0, delivered: 0, read: 0, failed: 0 });

export function createStatusTally(options: { enabled?: boolean } = {}): StatusTally {
  const enabled = options.enabled ?? tallyEnabled();

  const received = zeroed();
  const unique = zeroed();
  const seenPairs = new Set<string>();
  const seenMessages = new Set<string>();

  let batches = 0;
  let events = 0;
  let processed = 0;
  let retried = 0;
  let dlq = 0;
  let duplicates = 0;
  /** Anything that is not one of the four — a shape change worth noticing. */
  let other = 0;
  let saturated = false;

  const snapshot = (): StatusTallySnapshot => ({
    batches,
    events,
    messages: seenMessages.size,
    processed,
    retried,
    dlq,
    duplicates,
    other,
    received: { ...received },
    unique: { ...unique },
    saturated,
  });

  return {
    enabled,

    snapshot,

    record(batchEvents, outcome = {}) {
      if (!enabled) return;

      batches += 1;
      events += batchEvents.length;
      processed += outcome.processed ?? 0;
      retried += outcome.retried ?? 0;
      dlq += outcome.dlq ?? 0;

      const inBatch = zeroed();

      for (const event of batchEvents) {
        const status = String(event.status ?? "").toLowerCase();
        if (!STATUSES.includes(status as Status)) {
          other += 1;
          continue;
        }

        const key = status as Status;
        received[key] += 1;
        inBatch[key] += 1;

        const messageId = event.messageId;
        if (!messageId) continue;

        if (saturated || seenPairs.size >= MAX_TRACKED_PAIRS) {
          // Past the cap the sets stop growing, so `unique` stops being exact.
          // Say so once rather than reporting a number that quietly drifts.
          if (!saturated) {
            saturated = true;
            log.warn(
              `[status-tally] tracked ${MAX_TRACKED_PAIRS} message/status pairs; unique counts are a floor from here`,
            );
          }
          continue;
        }

        seenMessages.add(messageId);
        const pair = `${messageId}:${key}`;
        if (seenPairs.has(pair)) {
          duplicates += 1;
          continue;
        }
        seenPairs.add(pair);
        unique[key] += 1;
      }

      log.info(formatTally(snapshot(), inBatch));
    },
  };
}

/**
 * One line per batch: what just arrived, the totals, and whether the totals add
 * up. The invariants are printed rather than merely checked so a mismatch shows
 * which side is short.
 */
export function formatTally(totals: StatusTallySnapshot, batch: Record<Status, number>): string {
  const counts = (values: Record<Status, number>) =>
    STATUSES.map((status) => `${status}=${values[status]}`).join(" ");

  const { unique } = totals;
  const parts = [
    `[status-tally] batch #${totals.batches} (${counts(batch)})`,
    `totals messages=${totals.messages} ${counts(unique)}`,
    `events=${totals.events} processed=${totals.processed} retried=${totals.retried} dlq=${totals.dlq}`,
  ];

  if (totals.duplicates) parts.push(`redelivered=${totals.duplicates}`);
  if (totals.other) parts.push(`unrecognised=${totals.other}`);

  // Only meaningful once a campaign has drained; before that a `delivered` is
  // simply still in flight, so this reads "how far off" rather than pass/fail.
  const checks = [
    `sent-messages=${unique.sent - totals.messages}`,
    `delivered+failed-sent=${unique.delivered + unique.failed - unique.sent}`,
    `read+failed-sent=${unique.read + unique.failed - unique.sent}`,
  ];
  const settled = checks.every((check) => check.endsWith("=0"));
  parts.push(settled && !totals.saturated ? "balanced" : `drift ${checks.join(" ")}`);

  return parts.join(" | ");
}
