import { describe, expect, test } from "vitest";

import { dripStageDueAt, isDripStageDue } from "./wa_message_scheduler.js";

/**
 * Due time is per participant, not per stage.
 *
 * The cron used to collapse a stage's participants to whichever had joined most
 * recently (`DISTINCT ON ... ORDER BY p."createdAt" DESC`) and judge the whole
 * stage by that one date, so enrolling one contact held everyone else back.
 */
describe("isDripStageDue", () => {
  const NOW = new Date("2026-03-10T12:00:00Z");
  const base = {
    delay: 3,
    delayUnit: "days",
    sendAtTime: null,
    campaignStartedAt: new Date("2026-03-01T09:00:00Z"),
    now: NOW,
  };

  test("is due once the delay has elapsed since the campaign started", () => {
    expect(
      isDripStageDue({ ...base, participantCreatedAt: new Date("2026-03-01T09:00:00Z") }),
    ).toBe(true);
  });

  test("is not due while the delay is still running", () => {
    expect(
      isDripStageDue({ ...base, delay: 30, participantCreatedAt: base.campaignStartedAt }),
    ).toBe(false);
  });

  test("measures a late joiner from when they joined, not from the campaign start", () => {
    // Enrolled on the 9th, so a 3-day stage is due on the 12th — not now, even
    // though the campaign itself started nine days ago.
    expect(
      isDripStageDue({ ...base, participantCreatedAt: new Date("2026-03-09T09:00:00Z") }),
    ).toBe(false);
  });

  test("a late joiner does not hold back someone already waiting", () => {
    const early = isDripStageDue({
      ...base,
      participantCreatedAt: new Date("2026-03-01T09:00:00Z"),
    });
    const late = isDripStageDue({
      ...base,
      participantCreatedAt: new Date("2026-03-09T09:00:00Z"),
    });

    expect([early, late]).toEqual([true, false]);
  });

  test("honours the stage's send-at time", () => {
    // Due on the 4th at 23:00, which is long past by the 10th.
    expect(
      isDripStageDue({
        ...base,
        sendAtTime: "23:00",
        participantCreatedAt: new Date("2026-03-01T09:00:00Z"),
      }),
    ).toBe(true);
  });

  test("falls back to the join date when the campaign has no start stamp", () => {
    expect(
      isDripStageDue({
        ...base,
        campaignStartedAt: null,
        participantCreatedAt: new Date("2026-03-01T09:00:00Z"),
      }),
    ).toBe(true);
  });
});

/**
 * The tick's own latency, which is what made a multi-stage drip look slow.
 *
 * The sweep used to enqueue only what was *already* due, so a stage due at 15:59
 * waited for the 16:02 pass. Two stages configured two minutes apart therefore
 * went out four minutes apart — one cron interval — and it read as "the second
 * stage takes longer". The fan-out is armed for the exact moment now, so the
 * wait sits in BullMQ instead of in the gap between passes.
 */
describe("arming a stage ahead of its moment", () => {
  const NOW = new Date("2026-03-10T12:00:00Z");
  const LOOKAHEAD_MS = 5 * 60 * 1000;
  const base = {
    delay: 1,
    delayUnit: "minutes",
    sendAtTime: null,
    campaignStartedAt: new Date("2026-03-10T11:00:00Z"),
  };

  /** What the cron's filter does with a row: arm it, or leave it for later. */
  const armed = (participantCreatedAt: Date) =>
    dripStageDueAt({ ...base, participantCreatedAt }).getTime() <= NOW.getTime() + LOOKAHEAD_MS;

  test("arms a stage whose moment falls before the next pass", () => {
    // Joins at 12:02, +1 minute, so due 12:03 — three minutes out, inside the
    // window. This is the case that used to wait a whole extra tick.
    expect(armed(new Date("2026-03-10T12:02:00Z"))).toBe(true);
  });

  test("still arms a stage that is already overdue", () => {
    expect(armed(new Date("2026-03-10T11:00:00Z"))).toBe(true);
  });

  test("leaves a stage well past the window for a later pass", () => {
    // Due 12:31, far beyond the lookahead — arming it now would hold a send
    // session open for half an hour.
    expect(armed(new Date("2026-03-10T12:30:00Z"))).toBe(false);
  });

  test("the window is wider than the tick, so nothing falls between passes", () => {
    // A stage due 4m30s out is caught by this pass rather than by the next one,
    // which would already be late for it.
    expect(armed(new Date("2026-03-10T12:03:30Z"))).toBe(true);
  });

  test("isDripStageDue still reports the moment itself, not the window", () => {
    // The card and the arming decision are different questions: "is it time?"
    // versus "should the job be booked yet?".
    expect(
      isDripStageDue({ ...base, participantCreatedAt: new Date("2026-03-10T12:02:00Z"), now: NOW }),
    ).toBe(false);
  });
});
