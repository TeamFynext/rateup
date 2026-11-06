import { describe, expect, it } from "vitest";

import { createStatusTally, formatTally } from "./statusTally.js";

/** One campaign's worth of receipts, in the order the sender emits them. */
function campaign(participants: number, failureRate: number) {
  const failing = new Set<number>();
  for (let index = 0; index < participants; index++) {
    if (index % Math.round(1 / failureRate) === 0) failing.add(index);
  }

  const events: { messageId: string; status: string }[] = [];
  for (let index = 0; index < participants; index++) {
    const messageId = `wamid.Test${index}`;
    events.push({ messageId, status: "sent" });
    if (failing.has(index)) {
      events.push({ messageId, status: "failed" });
    } else {
      events.push({ messageId, status: "delivered" });
      events.push({ messageId, status: "read" });
    }
  }
  return { events, failed: failing.size };
}

describe("status tally", () => {
  it("counts a whole campaign, batch by batch", () => {
    const PARTICIPANTS = 8485;
    const { events, failed } = campaign(PARTICIPANTS, 0.2);
    const tally = createStatusTally({ enabled: true });

    for (let start = 0; start < events.length; start += 100) {
      tally.record(events.slice(start, start + 100));
    }

    const totals = tally.snapshot();
    expect(totals.messages).toBe(PARTICIPANTS);
    expect(totals.unique).toEqual({
      sent: PARTICIPANTS,
      delivered: PARTICIPANTS - failed,
      read: PARTICIPANTS - failed,
      failed,
    });
    expect(totals.unique.delivered + totals.unique.failed).toBe(PARTICIPANTS);
    expect(totals.unique.read + totals.unique.failed).toBe(PARTICIPANTS);
    expect(formatTally(totals, { sent: 0, delivered: 0, read: 0, failed: 0 })).toContain(
      "balanced",
    );
  });

  it("separates a redelivery from a receipt that is genuinely new", () => {
    const tally = createStatusTally({ enabled: true });
    const event = { messageId: "wamid.Test1", status: "sent" };

    tally.record([event]);
    tally.record([event], { retried: 1 });

    const totals = tally.snapshot();
    expect(totals.received.sent).toBe(2);
    expect(totals.unique.sent).toBe(1);
    expect(totals.duplicates).toBe(1);
    expect(totals.retried).toBe(1);
  });

  it("reports how far a half-drained campaign is from balancing", () => {
    const tally = createStatusTally({ enabled: true });
    tally.record([
      { messageId: "a", status: "sent" },
      { messageId: "b", status: "sent" },
      { messageId: "a", status: "delivered" },
    ]);

    const line = formatTally(tally.snapshot(), { sent: 2, delivered: 1, read: 0, failed: 0 });
    expect(line).toContain("delivered+failed-sent=-1");
    expect(line).toContain("read+failed-sent=-2");
    expect(line).not.toContain("balanced");
  });

  it("stays quiet when switched off", () => {
    const tally = createStatusTally({ enabled: false });
    tally.record([{ messageId: "a", status: "sent" }]);
    expect(tally.snapshot().events).toBe(0);
  });
});
