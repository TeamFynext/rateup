import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    survey: { count: vi.fn() },
    usageStats: { findUnique: vi.fn() },
    surveyTeamMap: { findUnique: vi.fn() },
  },
}));
vi.mock("../subscription/subscription.service.js", () => ({ getSubscription: vi.fn() }));
vi.mock("../../utils/email/payments/usageLimitAlert.js", () => ({
  sendUsageLimitMailAlert: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { sendUsageLimitMailAlert } from "../../utils/email/payments/usageLimitAlert.js";
import { getSubscription } from "../subscription/subscription.service.js";
import { UNLIMITED_COUNT } from "../subscription/subscription.data.js";
import { verifySurveyMonthlyLimitRestriction } from "./survey.auth.js";
import { enforceResponseLimit } from "./survey.limits.js";

function replyStub() {
  const sent: { code?: number; body?: any } = {};
  const reply = {
    code(code: number) {
      sent.code = code;
      return reply;
    },
    send(body: unknown) {
      sent.body = body;
      return reply;
    },
  };
  return { reply, sent };
}

/** The form allowance, as a plan stores it. Responses are the only metered figure. */
const features = (responses: number) => ({
  webSurvey: { count: { monthlyResponseLimit: responses } },
});

describe("the monthly form-response limit", () => {
  function usage(monthlySurveyResponses: number | null) {
    vi.mocked(prisma.usageStats.findUnique).mockResolvedValue(
      monthlySurveyResponses === null ? null : ({ monthlySurveyResponses } as never),
    );
  }

  beforeEach(() => {
    vi.mocked(prisma.surveyTeamMap.findUnique)
      .mockReset()
      .mockResolvedValue({ team: { orgId: "org-1" } } as never);
    vi.mocked(getSubscription)
      .mockReset()
      .mockResolvedValue({ features: features(100) } as never);
    vi.mocked(prisma.usageStats.findUnique).mockReset();
    vi.mocked(sendUsageLimitMailAlert)
      .mockReset()
      .mockResolvedValue({} as never);
    usage(0);
  });

  test("closes the public form once the month's responses are spent", async () => {
    usage(100);
    const { reply, sent } = replyStub();

    await verifySurveyMonthlyLimitRestriction({ params: { id: "map-1" } } as any, reply as never);

    expect(sent.code).toBe(403);
    // The respondent is the org's customer, not Rateup's: no plan, no number, no upsell.
    expect(sent.body.message).not.toMatch(/upgrade|plan|limit/i);
    // The code is what the form page reads to know a retry is pointless.
    expect(sent.body.reason).toBe("form_closed");
  });

  test("mails the org owner, who is the only one who can act on it", async () => {
    usage(100);
    const { reply } = replyStub();

    await verifySurveyMonthlyLimitRestriction({ params: { id: "map-1" } } as any, reply as never);

    expect(sendUsageLimitMailAlert).toHaveBeenCalledWith("org-1");
  });

  test("serves the form while there is room", async () => {
    usage(99);
    const { reply, sent } = replyStub();

    await verifySurveyMonthlyLimitRestriction({ params: { id: "map-1" } } as any, reply as never);

    expect(sent.code).toBeUndefined();
  });

  test("resolves an 8-character link as a short id", async () => {
    const { reply } = replyStub();

    await verifySurveyMonthlyLimitRestriction(
      { params: { id: "abcd1234" } } as any,
      reply as never,
    );

    expect(vi.mocked(prisma.surveyTeamMap.findUnique).mock.calls[0][0]).toMatchObject({
      where: { shortUrlId: "abcd1234" },
    });
  });

  test("leaves an unknown link to the handler's 404", async () => {
    vi.mocked(prisma.surveyTeamMap.findUnique).mockResolvedValue(null as never);
    const { reply, sent } = replyStub();

    await verifySurveyMonthlyLimitRestriction({ params: { id: "nope" } } as any, reply as never);

    expect(sent.code).toBeUndefined();
  });

  describe("on submit", () => {
    test("refuses a submission past the allowance, whatever the page said", async () => {
      // The page-load gate is a courtesy; a form already open in a tab arrives here.
      usage(100);
      const { reply, sent } = replyStub();

      await enforceResponseLimit({ body: { surveyTeamMapId: "map-1" } } as any, reply as never);

      expect(sent.code).toBe(403);
      expect(sent.body.reason).toBe("form_closed");
    });

    test("exempts WhatsApp, which is metered as conversations", async () => {
      // Counting it here as well would take the same usage off the org twice.
      usage(100);
      const { reply, sent } = replyStub();

      await enforceResponseLimit(
        { body: { surveyTeamMapId: "map-1", platform: "WHATSAPP" } } as any,
        reply as never,
      );

      expect(sent.code).toBeUndefined();
      expect(prisma.surveyTeamMap.findUnique).not.toHaveBeenCalled();
    });

    test("files the response when the org has no usage row to compare against", async () => {
      // Missing bookkeeping is not the respondent's fault, and a public form going dark
      // over it is the worse failure.
      usage(null);
      const { reply, sent } = replyStub();

      await enforceResponseLimit({ body: { surveyTeamMapId: "map-1" } } as any, reply as never);

      expect(sent.code).toBeUndefined();
    });

    test("does not meter an uncapped plan", async () => {
      vi.mocked(getSubscription).mockResolvedValue({
        features: features(UNLIMITED_COUNT),
      } as never);
      usage(50_000_000);
      const { reply, sent } = replyStub();

      await enforceResponseLimit({ body: { surveyTeamMapId: "map-1" } } as any, reply as never);

      expect(sent.code).toBeUndefined();
    });
  });
});
