import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    $queryRaw: vi.fn(),
    campaign: { findUnique: vi.fn() },
    campaignSend: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
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
vi.mock("../../workers/bullmq/queues/campaignRetry.queue.js", () => ({
  armCampaignRetry: vi.fn(),
  campaignRetryFire: { getJob: vi.fn() },
  campaignRetryJobId: (id: string) => `campaignSend-${id}`,
}));

import prisma from "../../utils/prisma.js";
import { getConversationBudget } from "../subscription/conversationBudget.js";
import { createCampaignSend } from "./campaignSend.service.js";
import { enqueueCampaignMessage } from "./campaign.service.js";
import { finishCampaignIfSettled } from "./campaignSettle.service.js";
import {
  armCampaignRetry,
  campaignRetryFire,
} from "../../workers/bullmq/queues/campaignRetry.queue.js";
import {
  fireCampaignSendById,
  reconcileScheduledCampaignSends,
  getRetryCohort,
  scheduleNextRetry,
} from "./campaignRetry.service.js";
import { CampaignParticipantStatus, CampaignType } from "../../types/enums.js";
import type { CampaignRetryStrategy } from "../../../generated/prisma/enums.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  $queryRaw: Mock;
  campaign: { findUnique: Mock };
  campaignSend: {
    findUnique: Mock;
    findFirst: Mock;
    update: Mock;
    findMany: Mock;
    count: Mock;
  };
  campaignParticipant: { count: Mock };
};
const budget = getConversationBudget as unknown as Mock;
const createSend = createCampaignSend as unknown as Mock;
const enqueue = enqueueCampaignMessage as unknown as Mock;
const arm = armCampaignRetry as unknown as Mock;

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

/** The send that opened the current cycle — attempt 0 unless a test resends. */
function cycleStart(overrides: Record<string, unknown> = {}) {
  return {
    attemptNo: 0,
    completedAt: new Date("2026-03-01T10:00:00Z"),
    startedAt: null,
    createdAt: new Date("2026-03-01T09:30:00Z"),
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
  // The cycle starts at the initial send and no retry has run yet: the common
  // case, and what makes the next attempt number 1. Its completion is also the
  // anchor a SMART schedule divides its window from.
  db.campaignSend.findFirst.mockResolvedValue(cycleStart());
  db.campaignSend.count.mockResolvedValue(0);
  createSend.mockResolvedValue({ id: "next-send", attemptNo: 1 });
  enqueue.mockResolvedValue({ status: true, message: "ok" });
  db.campaignSend.update.mockResolvedValue({});
});

describe("scheduleNextRetry", () => {
  beforeEach(() => {
    // Messages still in flight by default: the common case at drain time, and
    // what keeps a retry worth booking.
    db.campaignParticipant.count.mockResolvedValue(3);
  });

  test("schedules the first retry a sixteenth of the window out", async () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-03-01T10:00:00Z"));
    db.campaignSend.findUnique.mockResolvedValue(send());

    await scheduleNextRetry(SEND_ID);

    expect(createSend).toHaveBeenCalledTimes(1);
    const arg = createSend.mock.calls[0][0];
    expect(arg.trigger).toBe("AUTO_RETRY");
    expect(arg.status).toBe("SCHEDULED");
    expect(arg.targetStatuses).toEqual([CampaignParticipantStatus.FAILED]);
    // A sixteenth of the default 3-day window is 4h30m. On a 12-hour window this
    // same rung is the familiar 45 minutes.
    expect(arg.scheduledFor.toISOString()).toBe("2026-03-01T14:30:00.000Z");
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

  test("books one when the send it just drained is still waiting on receipts", async () => {
    // The retry case: its recipients still read FAILED from the previous attempt,
    // so nothing is PENDING or SENT, and the fresh messages have no error code
    // yet so the cohort is empty too. Only the send's own unresolved messages say
    // the campaign is mid-attempt — without them the chain stopped at attempt 1.
    db.campaignSend.findUnique.mockResolvedValue(send());
    db.campaignParticipant.count.mockResolvedValue(0);
    // Unresolved messages settle it on their own — the cohort is not even asked,
    // because an empty one right now says nothing about what the receipts will say.
    db.$queryRaw.mockResolvedValue([{ count: 19 }]);

    await scheduleNextRetry(SEND_ID);

    expect(createSend).toHaveBeenCalledTimes(1);
  });

  test("asks about the drained send's own messages, not the campaign's", async () => {
    // Scoped to this send on purpose: a campaign-wide question would let one
    // ancient message that never received a webhook hold retries open forever.
    db.campaignSend.findUnique.mockResolvedValue(send());
    db.campaignParticipant.count.mockResolvedValue(0);
    db.$queryRaw.mockResolvedValueOnce([{ count: 0 }]).mockResolvedValueOnce([]);

    await scheduleNextRetry(SEND_ID);

    const [, ...values] = db.$queryRaw.mock.calls[0];
    expect(values).toContain(SEND_ID);
    expect(createSend).not.toHaveBeenCalled();
  });

  test("counts retries per cycle, so a resend does not spend the retry budget", async () => {
    // Attempt 4 of the campaign, but the fourth attempt is a *resend* — the person
    // asked for it. Numbering off `attemptNo` made its first retry "attempt 5 of
    // 3" and refused it, so a campaign that was resent once quietly lost retries.
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
    // The cycle opened at attempt 3 (the resend) and no retry has run since.
    db.campaignSend.findFirst.mockResolvedValue(cycleStart({ attemptNo: 3 }));
    db.campaignSend.count.mockResolvedValue(0);

    await scheduleNextRetry(SEND_ID);

    expect(createSend).toHaveBeenCalledTimes(1);
    expect(createSend.mock.calls[0][0].note).toBe("Automatic retry 1 of 3.");
    // Counted from the send that opened the cycle, not from attempt 0.
    expect(db.campaignSend.count.mock.calls[0][0].where.attemptNo).toEqual({ gt: 3, lte: 3 });
  });

  test("never schedules sooner than the settle delay, whatever the policy says", async () => {
    // Without the floor this would build a cohort from statuses that have not
    // landed yet — the queue drains before Meta's webhooks arrive.
    vi.useFakeTimers().setSystemTime(new Date("2026-03-01T10:00:00Z"));
    // Drained yesterday evening, so the attempt's absolute slot — the anchor plus
    // a sixteenth of the window — has already passed and the floor is the only
    // thing left deciding when it fires.
    const drained = new Date("2026-02-28T20:00:00Z");
    db.campaignSend.findUnique.mockResolvedValue(send({ completedAt: drained }));
    db.campaignSend.findFirst.mockResolvedValue(cycleStart({ completedAt: drained }));

    await scheduleNextRetry(SEND_ID);

    expect(createSend.mock.calls[0][0].scheduledFor.toISOString()).toBe("2026-03-01T10:02:00.000Z");
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
    // Three retries already spent on this send.
    db.campaignSend.count.mockResolvedValue(3);

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

  test("stops when quiet hours push the attempt past the window", async () => {
    // Half an hour of waking time is left before 22:00, so the settle delay lands
    // at 08:15 the next morning — past the deadline the customer set.
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
    db.campaignSend.findFirst.mockResolvedValue(
      cycleStart({ completedAt: new Date("2026-03-01T21:30:00Z") }),
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

    // The permanent codes must never reach the parameter list, or a template
    // the campaign will never fix would be retried until the attempts ran out.
    const [, ...values] = db.$queryRaw.mock.calls[0];
    const codes = values.find((v: unknown) => Array.isArray(v)) as number[];
    expect(codes).toContain(131049);
    // Undeliverable-now: retried on a later attempt, never in place.
    expect(codes).toContain(131026);
    expect(codes).not.toContain(133010);
    expect(codes).not.toContain(132001);
  });
});

describe("fireCampaignSendById", () => {
  beforeEach(() => {
    db.campaign.findUnique.mockResolvedValue({
      dailySendLimit: null,
      team: { orgId: "org-1" },
    });
    budget.mockResolvedValue({ metered: false, isAnnual: false });
  });

  /** The claim query returns the row it won; the cohort query returns participants. */
  function due(rows: unknown[], cohort: string[]) {
    db.$queryRaw.mockResolvedValueOnce(rows).mockResolvedValue(cohort.map((id) => ({ id })));
  }

  test("fires a due retry with the exact cohort", async () => {
    due([{ id: SEND_ID, campaignId: CAMPAIGN_ID, attemptNo: 1 }], ["p-1", "p-2"]);

    await expect(fireCampaignSendById(SEND_ID)).resolves.toBe("fired");
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ campaignSendId: SEND_ID, participantIds: ["p-1", "p-2"] }),
    );
  });

  test("settles the campaign when a cancelled retry was the last thing open", async () => {
    due([{ id: SEND_ID, campaignId: CAMPAIGN_ID, attemptNo: 1 }], []);

    await fireCampaignSendById(SEND_ID);

    // Otherwise the campaign waits on RETRYING for an attempt that will never run.
    expect(finishCampaignIfSettled).toHaveBeenCalledWith(CAMPAIGN_ID);
  });

  test("cancels rather than firing when nothing is left to retry", async () => {
    due([{ id: SEND_ID, campaignId: CAMPAIGN_ID, attemptNo: 1 }], []);

    await expect(fireCampaignSendById(SEND_ID)).resolves.toBe("cancelled");
    expect(enqueue).not.toHaveBeenCalled();
    expect(db.campaignSend.update.mock.calls[0][0].data.status).toBe("CANCELLED");
  });

  test("sends what fits and records what did not", async () => {
    budget.mockResolvedValue({ metered: true, remaining: 2, isAnnual: false });
    due([{ id: SEND_ID, campaignId: CAMPAIGN_ID, attemptNo: 1 }], ["p-1", "p-2", "p-3", "p-4"]);

    await expect(fireCampaignSendById(SEND_ID)).resolves.toBe("fired");

    const update = db.campaignSend.update.mock.calls[0][0].data;
    expect(update.totalSkipped).toBe(2);
    expect(update.note).toContain("2 did not fit");
    expect(enqueue.mock.calls[0][0].participantIds).toEqual(["p-1", "p-2"]);
  });

  test("cancels outright when the allowance is fully spent", async () => {
    budget.mockResolvedValue({ metered: true, remaining: 0, isAnnual: false });
    due([{ id: SEND_ID, campaignId: CAMPAIGN_ID, attemptNo: 1 }], ["p-1"]);

    await expect(fireCampaignSendById(SEND_ID)).resolves.toBe("cancelled");
    expect(enqueue).not.toHaveBeenCalled();
  });

  test("marks a send FAILED when it cannot be started, and keeps going", async () => {
    enqueue.mockResolvedValue({ status: false, message: "redis is down" });
    due([{ id: SEND_ID, campaignId: CAMPAIGN_ID, attemptNo: 1 }], ["p-1"]);

    await expect(fireCampaignSendById(SEND_ID)).resolves.toBe("skipped");
    expect(db.campaignSend.update.mock.calls.at(-1)![0].data.status).toBe("FAILED");
  });

  test("does nothing when the row is no longer claimable", async () => {
    // Cancelled, already claimed, or not actually due yet — the conditional
    // UPDATE returns no row and the delayed job is a no-op.
    db.$queryRaw.mockResolvedValue([]);
    await expect(fireCampaignSendById(SEND_ID)).resolves.toBe("skipped");
  });
});

describe("arming the delayed job", () => {
  test("arms a newly scheduled retry for its scheduledFor", async () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-03-01T10:00:00Z"));
    db.campaignSend.findUnique.mockResolvedValue(send());
    db.campaignParticipant.count.mockResolvedValue(3);
    createSend.mockResolvedValue({ id: "new-send" });

    await scheduleNextRetry(SEND_ID);

    const [id, when] = arm.mock.calls[0];
    expect(id).toBe("new-send");
    // The row and its job must agree, or the job fires before the claim allows it.
    expect(when.toISOString()).toBe(createSend.mock.calls[0][0].scheduledFor.toISOString());
  });

  test("does not arm anything when no retry was scheduled", async () => {
    db.campaignSend.count.mockResolvedValue(3);
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

    await scheduleNextRetry(SEND_ID);

    expect(arm).not.toHaveBeenCalled();
  });
});

describe("reconcileScheduledCampaignSends", () => {
  test("re-arms only the rows whose delayed job is gone", async () => {
    // The whole point of the sweep: a flushed Redis leaves rows nothing will
    // ever look at, and those must be armed again without disturbing the rest.
    db.campaignSend.findMany.mockResolvedValue([
      { id: "has-job", scheduledFor: new Date("2026-03-01T12:00:00Z") },
      { id: "lost-job", scheduledFor: new Date("2026-03-01T13:00:00Z") },
    ]);
    (campaignRetryFire.getJob as unknown as Mock).mockImplementation(async (jobId: string) =>
      jobId === "campaignSend-has-job" ? { id: jobId } : undefined,
    );

    await expect(reconcileScheduledCampaignSends()).resolves.toEqual({ checked: 2, armed: 1 });
    expect(arm).toHaveBeenCalledTimes(1);
    expect(arm.mock.calls[0][0]).toBe("lost-job");
  });
});
