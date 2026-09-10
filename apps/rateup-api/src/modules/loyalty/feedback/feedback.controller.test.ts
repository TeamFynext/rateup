import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyFeedbackRequest: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../accounts/account.service.js", () => ({ assignRewardToCustomer: vi.fn() }));
vi.mock("../../whatsapp/wa_axios.js", () => ({
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("../../whatsapp/wa_error_handler.js", () => ({ getGraphApiErrorMessage: vi.fn() }));
vi.mock("./feedback.service.js", () => ({
  FeedbackError: class FeedbackError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
    }
  },
  getFeedbackOverview: vi.fn(),
  getFeedbackResults: vi.fn(),
  listFeedbackFlowCandidates: vi.fn(),
  listFeedbackRequests: vi.fn(),
  detachFeedback: vi.fn(),
  setupFeedback: vi.fn(),
  submitFeedbackFlow: vi.fn(),
  updateFeedbackSetting: vi.fn(),
}));

process.env.FLOW_TOKEN_SECRET = "test-secret";

import prisma from "../../../utils/prisma.js";
import { assignRewardToCustomer } from "../accounts/account.service.js";
import { signReviewRedirect } from "./feedback.redirect.js";
import { FeedbackError, setupFeedback } from "./feedback.service.js";
import { reviewRedirectHandler, setupFeedbackHandler } from "./feedback.controller.js";

const db = prisma as unknown as {
  loyaltyFeedbackRequest: {
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const REQUEST_ID = "2f0a7d2e-6b7e-4f2d-9a1e-0f3f5c1d9b11";
const GOOGLE = "https://g.page/r/kettle/review";

function reply() {
  const r = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    redirectedTo: undefined as string | undefined,
    code: vi.fn((code: number) => {
      r.statusCode = code;
      return r;
    }),
    type: vi.fn(() => r),
    send: vi.fn((body?: unknown) => {
      r.body = body;
      return r;
    }),
    redirect: vi.fn((url: string, code: number) => {
      r.redirectedTo = url;
      r.statusCode = code;
      return r;
    }),
  };
  return r;
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: REQUEST_ID,
    accountId: "acct-1",
    status: "COMPLETED",
    happy: true,
    program: {
      feedbackSetting: {
        rewardId: "rew-1",
        team: { googleLink: GOOGLE, reviewPageLinks: null },
        reward: { id: "rew-1", status: "active" },
      },
    },
    ...overrides,
  };
}

const redirectRequest = (sig = signReviewRedirect(REQUEST_ID)) =>
  ({ params: { requestId: REQUEST_ID, sig } }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(row());
  db.loyaltyFeedbackRequest.updateMany.mockResolvedValue({ count: 1 });
  db.loyaltyFeedbackRequest.update.mockResolvedValue({});
  vi.mocked(assignRewardToCustomer).mockResolvedValue({ id: "cr-1" } as never);
});

describe("reviewRedirectHandler", () => {
  test("a bad signature is a 404, before any database read", async () => {
    const res = reply();
    await reviewRedirectHandler(redirectRequest("A".repeat(43)), res as never);
    expect(res.statusCode).toBe(404);
    expect(db.loyaltyFeedbackRequest.findUnique).not.toHaveBeenCalled();
  });

  test("an unknown request is a 404", async () => {
    db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(null);
    const res = reply();
    await reviewRedirectHandler(redirectRequest(), res as never);
    expect(res.statusCode).toBe(404);
  });

  test("the first tap records the click, grants the reward once, and forwards to Google", async () => {
    const res = reply();
    await reviewRedirectHandler(redirectRequest(), res as never);

    expect(db.loyaltyFeedbackRequest.updateMany).toHaveBeenCalledWith({
      where: { id: REQUEST_ID, reviewClickedAt: null },
      data: { reviewClickedAt: expect.any(Date) },
    });
    expect(assignRewardToCustomer).toHaveBeenCalledWith("acct-1", "rew-1");
    expect(db.loyaltyFeedbackRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: { rewardGrantedAt: expect.any(Date), customerRewardId: "cr-1" },
    });
    expect(res.redirectedTo).toBe(GOOGLE);
    expect(res.statusCode).toBe(302);
  });

  test("a second tap still forwards but grants nothing", async () => {
    db.loyaltyFeedbackRequest.updateMany.mockResolvedValue({ count: 0 });
    const res = reply();
    await reviewRedirectHandler(redirectRequest(), res as never);
    expect(assignRewardToCustomer).not.toHaveBeenCalled();
    expect(res.redirectedTo).toBe(GOOGLE);
  });

  test("a reward the customer already holds is not an error", async () => {
    vi.mocked(assignRewardToCustomer).mockRejectedValue(
      new Error("Reward is already assigned to this customer"),
    );
    const res = reply();
    await reviewRedirectHandler(redirectRequest(), res as never);
    expect(db.loyaltyFeedbackRequest.update).not.toHaveBeenCalled();
    expect(res.redirectedTo).toBe(GOOGLE);
  });

  test("an inactive or missing reward grants nothing", async () => {
    db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(
      row({
        program: {
          feedbackSetting: {
            rewardId: "rew-1",
            team: { googleLink: GOOGLE, reviewPageLinks: null },
            reward: { id: "rew-1", status: "INACTIVE" },
          },
        },
      }),
    );
    const res = reply();
    await reviewRedirectHandler(redirectRequest(), res as never);
    expect(assignRewardToCustomer).not.toHaveBeenCalled();
    expect(res.redirectedTo).toBe(GOOGLE);
  });

  test("an unhappy or unfinished request is forwarded without being counted", async () => {
    db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(row({ happy: false }));
    const res = reply();
    await reviewRedirectHandler(redirectRequest(), res as never);
    expect(db.loyaltyFeedbackRequest.updateMany).not.toHaveBeenCalled();
    expect(res.redirectedTo).toBe(GOOGLE);
  });

  test("with no Google link the customer sees a thank-you page instead of an error", async () => {
    db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(
      row({
        program: {
          feedbackSetting: {
            rewardId: null,
            team: { googleLink: null, reviewPageLinks: null },
            reward: null,
          },
        },
      }),
    );
    const res = reply();
    await reviewRedirectHandler(redirectRequest(), res as never);
    expect(res.statusCode).toBe(200);
    expect(res.type).toHaveBeenCalledWith("text/html");
    expect(String(res.body)).toContain("Thank you");
  });
});

describe("setupFeedbackHandler", () => {
  test("maps a FeedbackError to its status", async () => {
    vi.mocked(setupFeedback).mockRejectedValue(new FeedbackError(409, "Already set up"));
    const res = reply();
    await setupFeedbackHandler(
      { user: { orgId: "org-1" }, body: { dbFlowId: "flow-1", teamId: "t" } } as never,
      res as never,
    );
    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: "Already set up" });
  });

  test("anything else is a 500 with the message", async () => {
    vi.mocked(setupFeedback).mockRejectedValue(new Error("db down"));
    const res = reply();
    await setupFeedbackHandler({ user: { orgId: "org-1" }, body: {} } as never, res as never);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "db down" });
  });
});
