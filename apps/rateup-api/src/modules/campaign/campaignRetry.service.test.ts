import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    $queryRaw: vi.fn(),
    campaign: { findUnique: vi.fn() },
    campaignSend: { findUnique: vi.fn(), update: vi.fn() },
    campaignParticipant: { count: vi.fn() },
  },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), trace: vi.fn() },
}));
vi.mock("../subscription/conversationBudget.js", () => ({ getConversationBudget: vi.fn() }));
vi.mock("./campaignSend.service.js", async () => ({
  CampaignSendInProgressError: (
    await vi.importActual<typeof import("./campaignSend.service.js")>("./campaignSend.service.js")
  ).CampaignSendInProgressError,
  createCampaignSend: vi.fn(),
}));
vi.mock("./campaign.service.js", () => ({ enqueueCampaignMessage: vi.fn() }));
vi.mock("./campaignSettle.service.js", () => ({ finishCampaignIfSettled: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { getConversationBudget } from "../subscription/conversationBudget.js";
import { createCampaignSend } from "./campaignSend.service.js";
import { enqueueCampaignMessage } from "./campaign.service.js";
import { finishCampaignIfSettled } from "./campaignSettle.service.js";
import {
  getRetryCohort,
  nextAttemptAt,
  processScheduledCampaignSends,
  scheduleNextRetry,
  shiftOutOfQuietHours,
} from "./campaignRetry.service.js";
import { CampaignParticipantStatus, CampaignType } from "../../types/enums.js";
import type { CampaignRetryStrategy } from "../../../generated/prisma/enums.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  $queryRaw: Mock;
  campaign: { findUnique: Mock };
  campaignSend: { findUnique: Mock; update: Mock };
  campaignParticipant: { count: Mock };
};
const budget = getConversationBudget as unknown as Mock;
const createSend = createCampaignSend as unknown as Mock;
const enqueue = enqueueCampaignMessage as unknown as Mock;

const CAMPAIGN_ID = "11111111-1111-1111-1111-111111111111";
const SEND_ID = "22222222-2222-2222-2222-222222222222";

/** A policy with everything off except the switch, so each test names its own knobs. */
function policy(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    strategy: "SMART" as CampaignRetryStrategy,
    maxAttempts: 3,
    intervalHours: 24,
    windowEndsAt: null,
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: "Etc/UTC",
    ...overrides,
  };
}

function send(overrides: Record<string, unknown> = {}) {
  return {
    id: SEND_ID,
    campaignId: CAMPAIGN_ID,
    attemptNo: 0,
    dripStageId: null,
    completedAt: new Date("2026-03-01T10:00:00Z"),
    campaign: {
      id: CAMPAIGN_ID,
      type: CampaignType.WHATSAPP,
      CampaignRetryPolicy: policy(),
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  createSend.mockResolvedValue({ id: "next-send", attemptNo: 1 });
  enqueue.mockResolvedValue({ status: true, message: "ok" });
  db.campaignSend.update.mockResolvedValue({});
});

describe("nextAttemptAt", () => {
  const FROM = new Date("2026-03-01T10:00:00Z");

  test("front-loads the smart schedule, then decays: 45m, 4h, 12h", () => {
    expect(nextAttemptAt(policy(), 1, FROM).toISOString()).toBe("2026-03-01T10:45:00.000Z");
    expect(nextAttemptAt(policy(), 2, FROM).toISOString()).toBe("2026-03-01T14:00:00.000Z");
    expect(nextAttemptAt(policy(), 3, FROM).toISOString()).toBe("2026-03-01T22:00:00.000Z");
  });

  test("holds at the longest interval past the end of the table", () => {
    // Only reachable if maxAttempts ever exceeds the offsets we ship. Firing
    // immediately would be the wrong failure mode.
    expect(nextAttemptAt(policy(), 9, FROM).toISOString()).toBe("2026-03-01T22:00:00.000Z");
  });

  test("spaces fixed-interval attempts uniformly", () => {
    const fixed = policy({
      strategy: "FIXED_INTERVAL" as CampaignRetryStrategy,
      intervalHours: 24,
    });
    expect(nextAttemptAt(fixed, 1, FROM).toISOString()).toBe("2026-03-02T10:00:00.000Z");
    expect(nextAttemptAt(fixed, 3, FROM).toISOString()).toBe("2026-03-02T10:00:00.000Z");
  });

  test("never lets a zero or negative interval collapse to no wait", () => {
    const broken = policy({
      strategy: "FIXED_INTERVAL" as CampaignRetryStrategy,
      intervalHours: 0,
    });
    expect(nextAttemptAt(broken, 1, FROM).getTime()).toBeGreaterThan(FROM.getTime());
  });
});

describe("shiftOutOfQuietHours", () => {
  test("leaves a time outside the window alone", () => {
    const when = new Date("2026-03-01T12:00:00Z");
    const shifted = shiftOutOfQuietHours(
      when,
      policy({
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      }),
    );
    expect(shifted).toEqual(when);
  });

  test("moves the evening head of a wrapping window to the next morning", () => {
    const shifted = shiftOutOfQuietHours(
      new Date("2026-03-01T23:30:00Z"),
      policy({
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      }),
    );
    expect(shifted.toISOString()).toBe("2026-03-02T08:00:00.000Z");
  });

  test("moves the pre-dawn tail of a wrapping window to the same morning", () => {
    const shifted = shiftOutOfQuietHours(
      new Date("2026-03-02T03:00:00Z"),
      policy({
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      }),
    );
    expect(shifted.toISOString()).toBe("2026-03-02T08:00:00.000Z");
  });

  test("handles a window that does not wrap midnight", () => {
    const shifted = shiftOutOfQuietHours(
      new Date("2026-03-01T13:00:00Z"),
      policy({
        quietHoursStart: "12:00",
        quietHoursEnd: "14:00",
      }),
    );
    expect(shifted.toISOString()).toBe("2026-03-01T14:00:00.000Z");
  });

  test("respects the policy's own timezone, not the server's", () => {
    // 23:30 UTC is 05:00 next day in Kolkata — inside 22:00-08:00 local, and the
    // shift has to land on the local 08:00, i.e. 02:30 UTC.
    const shifted = shiftOutOfQuietHours(
      new Date("2026-03-01T23:30:00Z"),
      policy({
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
        timezone: "Asia/Kolkata",
      }),
    );
    expect(shifted.toISOString()).toBe("2026-03-02T02:30:00.000Z");
  });

  test("only ever delays — an unparseable or empty window is a no-op", () => {
    const when = new Date("2026-03-01T23:30:00Z");
    expect(shiftOutOfQuietHours(when, policy({ quietHoursStart: "22:00" }))).toEqual(when);
    expect(
      shiftOutOfQuietHours(when, policy({ quietHoursStart: "nope", quietHoursEnd: "08:00" })),
    ).toEqual(when);
    expect(
      shiftOutOfQuietHours(when, policy({ quietHoursStart: "22:00", quietHoursEnd: "22:00" })),
    ).toEqual(when);
  });
});

describe("scheduleNextRetry", () => {
  beforeEach(() => {
    // Messages still in flight by default: the common case at drain time, and
    // what keeps a retry worth booking.
    db.campaignParticipant.count.mockResolvedValue(3);
  });

  test("schedules the first retry 45 minutes out", async () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-03-01T10:00:00Z"));
    db.campaignSend.findUnique.mockResolvedValue(send());

    await scheduleNextRetry(SEND_ID);

    expect(createSend).toHaveBeenCalledTimes(1);
    const arg = createSend.mock.calls[0][0];
    expect(arg.trigger).toBe("AUTO_RETRY");
    expect(arg.status).toBe("SCHEDULED");
    expect(arg.targetStatuses).toEqual([CampaignParticipantStatus.FAILED]);
    expect(arg.scheduledFor.toISOString()).toBe("2026-03-01T10:45:00.000Z");
  });

  test("books nothing when every message landed and none failed", async () => {
    db.campaignSend.findUnique.mockResolvedValue(send());
    // Nothing in flight, so no webhook can turn a message into a failure...
    db.campaignParticipant.count.mockResolvedValue(0);
    // ...and nothing has failed retryably.
    db.$queryRaw.mockResolvedValue([]);

    await expect(scheduleNextRetry(SEND_ID)).resolves.toBeNull();
    expect(createSend).not.toHaveBeenCalled();
  });

  test("still books one when nothing is in flight but something failed retryably", async () => {
    db.campaignSend.findUnique.mockResolvedValue(send());
    db.campaignParticipant.count.mockResolvedValue(0);
    db.$queryRaw.mockResolvedValue([{ id: "p-1" }]);

    await scheduleNextRetry(SEND_ID);

    expect(createSend).toHaveBeenCalledTimes(1);
  });

  test("books one while messages are still in flight, whatever the cohort says now", async () => {
    db.campaignSend.findUnique.mockResolvedValue(send());
    db.campaignParticipant.count.mockResolvedValue(5);
    // Empty *now* only means the webhooks have not landed yet.
    db.$queryRaw.mockResolvedValue([]);

    await scheduleNextRetry(SEND_ID);

    expect(createSend).toHaveBeenCalledTimes(1);
  });

  test("never schedules sooner than the settle delay, whatever the policy says", async () => {
    // Without the floor this would build a cohort from statuses that have not
    // landed yet — the queue drains before Meta's webhooks arrive.
    vi.useFakeTimers().setSystemTime(new Date("2026-03-01T10:00:00Z"));
    db.campaignSend.findUnique.mockResolvedValue(
      send({
        // Drained half an hour ago, so the +45m offset measured from completion
        // is already inside the floor measured from now.
        completedAt: new Date("2026-03-01T09:30:00Z"),
      }),
    );

    await scheduleNextRetry(SEND_ID);

    expect(createSend.mock.calls[0][0].scheduledFor.toISOString()).toBe("2026-03-01T10:45:00.000Z");
  });

  test("stops once the attempts are exhausted", async () => {
    db.campaignSend.findUnique.mockResolvedValue(
      send({
        attemptNo: 3,
        campaign: {
          id: CAMPAIGN_ID,
          type: CampaignType.WHATSAPP,
          CampaignRetryPolicy: policy({ maxAttempts: 3 }),
        },
      }),
    );

    await expect(scheduleNextRetry(SEND_ID)).resolves.toBeNull();
    expect(createSend).not.toHaveBeenCalled();
  });

  test("stops once the retry window has closed", async () => {
    db.campaignSend.findUnique.mockResolvedValue(
      send({
        campaign: {
          id: CAMPAIGN_ID,
          type: CampaignType.WHATSAPP,
          CampaignRetryPolicy: policy({ windowEndsAt: new Date("2026-03-01T10:20:00Z") }),
        },
      }),
    );

    await expect(scheduleNextRetry(SEND_ID)).resolves.toBeNull();
    expect(createSend).not.toHaveBeenCalled();
  });

  test("checks the window after quiet hours, not before", async () => {
    // The raw offset (22:15) lands inside quiet hours, which push it to 08:00
    // the next morning — past the deadline the customer set.
    db.campaignSend.findUnique.mockResolvedValue(
      send({
        completedAt: new Date("2026-03-01T21:30:00Z"),
        campaign: {
          id: CAMPAIGN_ID,
          type: CampaignType.WHATSAPP,
          CampaignRetryPolicy: policy({
            quietHoursStart: "22:00",
            quietHoursEnd: "08:00",
            windowEndsAt: new Date("2026-03-02T06:00:00Z"),
          }),
        },
      }),
    );

    await expect(scheduleNextRetry(SEND_ID)).resolves.toBeNull();
  });

  test("does nothing without an enabled policy", async () => {
    db.campaignSend.findUnique.mockResolvedValue(
      send({
        campaign: {
          id: CAMPAIGN_ID,
          type: CampaignType.WHATSAPP,
          CampaignRetryPolicy: policy({ enabled: false }),
        },
      }),
    );
    await expect(scheduleNextRetry(SEND_ID)).resolves.toBeNull();

    db.campaignSend.findUnique.mockResolvedValue(
      send({
        campaign: { id: CAMPAIGN_ID, type: CampaignType.WHATSAPP, CampaignRetryPolicy: null },
      }),
    );
    await expect(scheduleNextRetry(SEND_ID)).resolves.toBeNull();
    expect(createSend).not.toHaveBeenCalled();
  });

  test("never retries a drip campaign — the drip cron owns its cadence", async () => {
    db.campaignSend.findUnique.mockResolvedValue(
      send({
        campaign: {
          id: CAMPAIGN_ID,
          type: CampaignType.DRIP,
          CampaignRetryPolicy: policy(),
        },
      }),
    );

    await expect(scheduleNextRetry(SEND_ID)).resolves.toBeNull();
    expect(createSend).not.toHaveBeenCalled();
  });

  test("gives way when a send is already live, rather than failing the drain", async () => {
    const { CampaignSendInProgressError } = await import("./campaignSend.service.js");
    db.campaignSend.findUnique.mockResolvedValue(send());
    createSend.mockRejectedValue(new CampaignSendInProgressError());

    await expect(scheduleNextRetry(SEND_ID)).resolves.toBeNull();
  });

  test("swallows an unexpected failure — a lost retry must not fail the send", async () => {
    db.campaignSend.findUnique.mockRejectedValue(new Error("db is down"));
    await expect(scheduleNextRetry(SEND_ID)).resolves.toBeNull();
  });
});

describe("getRetryCohort", () => {
  test("asks for failed participants whose latest error code is retryable", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "p-1" }, { id: "p-2" }]);

    await expect(getRetryCohort(CAMPAIGN_ID)).resolves.toEqual(["p-1", "p-2"]);

    // The permanent codes must never reach the parameter list, or an
    // undeliverable number would be retried until the attempts ran out.
    const [, ...values] = db.$queryRaw.mock.calls[0];
    const codes = values.find((v: unknown) => Array.isArray(v)) as number[];
    expect(codes).toContain(131049);
    expect(codes).not.toContain(131026);
    expect(codes).not.toContain(132001);
  });
});

describe("processScheduledCampaignSends", () => {
  beforeEach(() => {
    db.campaign.findUnique.mockResolvedValue({
      dailySendLimit: null,
      team: { orgId: "org-1" },
    });
    budget.mockResolvedValue({ metered: false, isAnnual: false });
  });

  /** The claim query returns due rows; the cohort query returns participants. */
  function due(rows: unknown[], cohort: string[]) {
    db.$queryRaw.mockResolvedValueOnce(rows).mockResolvedValue(cohort.map((id) => ({ id })));
  }

  test("fires a due retry with the exact cohort", async () => {
    due([{ id: SEND_ID, campaignId: CAMPAIGN_ID, attemptNo: 1 }], ["p-1", "p-2"]);

    await expect(processScheduledCampaignSends()).resolves.toEqual({ fired: 1, cancelled: 0 });
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ campaignSendId: SEND_ID, participantIds: ["p-1", "p-2"] }),
    );
  });

  test("settles the campaign when a cancelled retry was the last thing open", async () => {
    due([{ id: SEND_ID, campaignId: CAMPAIGN_ID, attemptNo: 1 }], []);

    await processScheduledCampaignSends();

    // Otherwise the campaign waits on RETRYING for an attempt that will never run.
    expect(finishCampaignIfSettled).toHaveBeenCalledWith(CAMPAIGN_ID);
  });

  test("cancels rather than firing when nothing is left to retry", async () => {
    due([{ id: SEND_ID, campaignId: CAMPAIGN_ID, attemptNo: 1 }], []);

    await expect(processScheduledCampaignSends()).resolves.toEqual({ fired: 0, cancelled: 1 });
    expect(enqueue).not.toHaveBeenCalled();
    expect(db.campaignSend.update.mock.calls[0][0].data.status).toBe("CANCELLED");
  });

  test("sends what fits and records what did not", async () => {
    budget.mockResolvedValue({ metered: true, remaining: 2, isAnnual: false });
    due([{ id: SEND_ID, campaignId: CAMPAIGN_ID, attemptNo: 1 }], ["p-1", "p-2", "p-3", "p-4"]);

    await expect(processScheduledCampaignSends()).resolves.toEqual({ fired: 1, cancelled: 0 });

    const update = db.campaignSend.update.mock.calls[0][0].data;
    expect(update.totalSkipped).toBe(2);
    expect(update.note).toContain("2 did not fit");
    expect(enqueue.mock.calls[0][0].participantIds).toEqual(["p-1", "p-2"]);
  });

  test("cancels outright when the allowance is fully spent", async () => {
    budget.mockResolvedValue({ metered: true, remaining: 0, isAnnual: false });
    due([{ id: SEND_ID, campaignId: CAMPAIGN_ID, attemptNo: 1 }], ["p-1"]);

    await expect(processScheduledCampaignSends()).resolves.toEqual({ fired: 0, cancelled: 1 });
    expect(enqueue).not.toHaveBeenCalled();
  });

  test("marks a send FAILED when it cannot be started, and keeps going", async () => {
    enqueue.mockResolvedValue({ status: false, message: "redis is down" });
    due([{ id: SEND_ID, campaignId: CAMPAIGN_ID, attemptNo: 1 }], ["p-1"]);

    await expect(processScheduledCampaignSends()).resolves.toEqual({ fired: 0, cancelled: 0 });
    expect(db.campaignSend.update.mock.calls.at(-1)![0].data.status).toBe("FAILED");
  });

  test("does nothing when nothing is due", async () => {
    db.$queryRaw.mockResolvedValue([]);
    await expect(processScheduledCampaignSends()).resolves.toEqual({ fired: 0, cancelled: 0 });
  });
});
