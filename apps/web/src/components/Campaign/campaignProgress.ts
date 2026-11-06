/**
 * The campaign card's progress bar, as non-overlapping segments.
 *
 * The API's counters are cumulative milestones, not buckets: a message that was
 * read also counted as delivered and as sent, and a send Meta refused outright
 * is booked as both sent and failed. Stacking the raw totals would count the
 * same message three times and overflow the bar, so each segment is what a
 * message reached *and nothing past it*:
 *
 * - read — `totalRead`
 * - delivered — delivered but not (yet) read
 * - sent — dispatched, with no delivery or failure back yet
 * - failed — recipients that stand FAILED now
 *
 * Widths are shares of the recipient count, so the empty track is who has not
 * been sent to.
 *
 * `dispatched` and `failed` are counted in *recipients*, not in messages. The
 * `CampaignStats` totals are per attempt: a recipient Meta rejected is booked
 * to `totalSend` and `totalFailed` together, and a retry that recovers them
 * bumps `totalSend` again without ever taking them out of `totalFailed`. Drawn
 * from those, a 114-recipient campaign with one retry filled a 115-wide bar and
 * left the recovered recipient red forever. The scale still takes the larger of
 * the two, since a receipt can land out of order.
 */

export type ProgressSegmentKey = "read" | "delivered" | "sent" | "failed";

export interface ProgressSegment {
  key: ProgressSegmentKey;
  label: string;
  count: number;
  /** Percentage of the bar, 0–100. */
  width: number;
  /** Tailwind background class for the segment and its legend dot. */
  color: string;
}

export interface CampaignProgressCounts {
  recipients?: number | null;
  /** Recipients handed to Meta at least once — not `totalSend`. */
  dispatched?: number | null;
  delivered?: number | null;
  read?: number | null;
  /** Recipients that stand FAILED now — not `totalFailed`. */
  failed?: number | null;
}

/** Drawn in this order, left to right: best outcome first, failures last. */
export const PROGRESS_SEGMENTS: ReadonlyArray<{
  key: ProgressSegmentKey;
  label: string;
  color: string;
}> = [
  // One hue — the brand blue at falling opacity — so the steps are even and
  // never drift in hue. The chart-* tokens looked like a ramp but were not one:
  // uneven steps, and dark mode reverses their order, which sank "Sent" into
  // the track. Dark mode lifts the floor for the same reason. Failed stays red,
  // softened a touch so it sits with the muted blues rather than shouting.
  { key: "read", label: "Read", color: "bg-primary" },
  { key: "delivered", label: "Delivered", color: "bg-primary/60 dark:bg-primary/70" },
  { key: "sent", label: "Sent", color: "bg-primary/30 dark:bg-primary/45" },
  { key: "failed", label: "Failed", color: "bg-destructive/85" },
];

const whole = (value: number | null | undefined) => Math.max(Math.floor(value ?? 0), 0);

export function campaignProgressSegments(counts: CampaignProgressCounts): ProgressSegment[] {
  const recipients = whole(counts.recipients);
  const read = whole(counts.read);
  // Never below read: receipts land out of order, so for a moment a message can
  // be counted read before its delivery is.
  const delivered = Math.max(whole(counts.delivered), read);
  const failed = whole(counts.failed);
  // What is left of dispatched once delivery and failure have claimed their share.
  const sent = Math.max(whole(counts.dispatched) - delivered - failed, 0);

  const buckets: Record<ProgressSegmentKey, number> = {
    read,
    delivered: delivered - read,
    sent,
    failed,
  };
  const total = read + buckets.delivered + sent + failed;
  const scale = Math.max(recipients, total);

  return PROGRESS_SEGMENTS.map((segment) => {
    const count = buckets[segment.key];
    return {
      ...segment,
      count,
      width: scale > 0 ? (count / scale) * 100 : 0,
    };
  });
}
