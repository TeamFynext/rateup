import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyFeedbackRequest: { findUnique: vi.fn(), updateMany: vi.fn() },
    customerLoyaltyAccount: {
      findUnique: vi.fn(async () => ({ contact: { id: "c-1", name: "Ann", phone: "15550001" } })),
    },
  },
}));
vi.mock("../../notification/notify.js", () => ({ notify: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../messaging/reply.js", () => ({ replyLoyalty: vi.fn() }));
vi.mock("../../whatsapp/settings/wa_settings.service.js", () => ({
  getWaSettingsById: vi.fn(async () => ({ phoneId: "phone-2" })),
}));

process.env.FLOW_TOKEN_SECRET = "test-secret";
process.env.API_URL = "https://api.example.test";

import prisma from "../../../utils/prisma.js";
import { notify } from "../../notification/notify.js";
import { getWaSettingsById } from "../../whatsapp/settings/wa_settings.service.js";
import { replyLoyalty } from "../messaging/reply.js";

/** What the completion replied: who to, on which number, and the message. */
const replied = () => {
  const [ctx, message] = vi.mocked(replyLoyalty).mock.calls[0]!;
  return { ctx, message, cta: message.parts!.cta! };
};
import { buildFeedbackFlowJson, getFeedbackDraft } from "../../whatsapp/flows/flowTemplates.js";
import { onFeedbackFlowCompleted } from "./feedback.completion.js";
import { resolveTeamGoogleLink } from "./feedback.googleLink.js";

const db = prisma as unknown as {
  loyaltyFeedbackRequest: {
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

const SCREENS = buildFeedbackFlowJson(getFeedbackDraft("restaurant")!).screens;

function request(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-1",
    accountId: "acct-1",
    program: {
      orgId: "org-1",
      feedbackSetting: {
        teamId: "team-1",
        team: { googleLink: "https://g.page/r/kettle/review", reviewPageLinks: null },
        reward: { name: "Free coffee", status: "ACTIVE" },
      },
    },
    ...overrides,
  };
}

const completion = (happy: boolean) => ({
  requestId: "req-1",
  orgId: "org-1",
  phone: "15550001",
  surveyResponseId: "resp-1",
  happy,
  screens: SCREENS,
  responses: [
    { questionId: "overall_rating", response: happy ? "5" : "2" },
    { questionId: "food_quality", response: "4" },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(request());
  db.loyaltyFeedbackRequest.updateMany.mockResolvedValue({ count: 1 });
});

describe("resolveTeamGoogleLink", () => {
  test("prefers googleLink, then the Google entry of the per-platform map", () => {
    expect(
      resolveTeamGoogleLink({ googleLink: "https://a", reviewPageLinks: { Google: "https://b" } }),
    ).toBe("https://a");
    expect(
      resolveTeamGoogleLink({ googleLink: "", reviewPageLinks: { Google: "https://b" } }),
    ).toBe("https://b");
    expect(
      resolveTeamGoogleLink({ googleLink: null, reviewPageLinks: { Custom: "https://c" } }),
    ).toBe(null);
    expect(resolveTeamGoogleLink({ googleLink: null, reviewPageLinks: ["nope"] })).toBeNull();
  });
});

describe("onFeedbackFlowCompleted", () => {
  test("closes the row with the rating and sends the tracked review CTA when happy", async () => {
    await onFeedbackFlowCompleted(completion(true));

    expect(db.loyaltyFeedbackRequest.updateMany).toHaveBeenCalledWith({
      where: { id: "req-1", status: { in: ["SENT", "SCHEDULED"] } },
      data: expect.objectContaining({
        status: "COMPLETED",
        happy: true,
        overallRating: 5,
        surveyResponseId: "resp-1",
      }),
    });

    expect(replyLoyalty).toHaveBeenCalledTimes(1);
    const { ctx, message, cta } = replied();
    expect(ctx).toMatchObject({ orgId: "org-1", channel: "WHATSAPP", from: "15550001" });
    expect(cta.label).toBe("Review us on Google");
    // The link goes through RateUp so the tap can be recorded and the reward granted.
    expect(cta.url).toMatch(
      /^https:\/\/api\.example\.test\/api\/public\/loyalty\/feedback\/review\/req-1\/[A-Za-z0-9_-]{43}$/,
    );
    expect(message.text).toContain("Free coffee");
  });

  // The survey leaves on the flow's own channel (sendFlow). Sending the CTA from the org
  // default instead means a different number on a multi-number org, where this customer
  // has no open 24-hour window and Meta refuses the message.
  test("sends the CTA from the channel the survey went out on", async () => {
    db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(
      request({
        program: {
          orgId: "org-1",
          feedbackSetting: {
            team: { googleLink: "https://g.page/r/kettle/review", reviewPageLinks: null },
            reward: null,
            flow: { whatsappSettingsId: "wa-settings-2" },
          },
        },
      }),
    );

    await onFeedbackFlowCompleted(completion(true));

    expect(getWaSettingsById).toHaveBeenCalledWith("wa-settings-2", "org-1");
    expect(replied().ctx.phoneId).toBe("phone-2");
  });

  test("a flow with no channel of its own leaves the send on the org default", async () => {
    await onFeedbackFlowCompleted(completion(true));

    expect(getWaSettingsById).not.toHaveBeenCalled();
    expect(replied().ctx.phoneId).toBeUndefined();
  });

  test("does not promise a reward that is inactive", async () => {
    db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(
      request({
        program: {
          orgId: "org-1",
          feedbackSetting: {
            team: { googleLink: "https://g.page/r/x/review", reviewPageLinks: null },
            reward: { name: "Free coffee", status: "inactive" },
          },
        },
      }),
    );
    await onFeedbackFlowCompleted(completion(true));
    expect(replied().message.text).not.toContain("Free coffee");
  });

  test("unhappy feedback is recorded, sends the customer nothing and alerts the team", async () => {
    await onFeedbackFlowCompleted(completion(false));

    expect(db.loyaltyFeedbackRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ happy: false, overallRating: 2 }),
      }),
    );
    expect(replyLoyalty).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith({
      event: "loyalty.feedback_negative",
      orgId: "org-1",
      audience: { kind: "permitted", teamId: "team-1" },
      data: { customerName: "Ann", contactId: "c-1", rating: 2 },
    });
  });

  test("happy feedback raises no alert", async () => {
    await onFeedbackFlowCompleted(completion(true));
    expect(notify).not.toHaveBeenCalled();
  });

  test("a retried completion finds the row closed and sends nothing twice", async () => {
    db.loyaltyFeedbackRequest.updateMany.mockResolvedValue({ count: 0 });
    await onFeedbackFlowCompleted(completion(true));
    expect(replyLoyalty).not.toHaveBeenCalled();
  });

  test("a team without a Google link gets no CTA", async () => {
    db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(
      request({
        program: {
          orgId: "org-1",
          feedbackSetting: { team: { googleLink: null, reviewPageLinks: null }, reward: null },
        },
      }),
    );
    await onFeedbackFlowCompleted(completion(true));
    expect(replyLoyalty).not.toHaveBeenCalled();
  });

  test("ignores an unknown request or one from another org", async () => {
    db.loyaltyFeedbackRequest.findUnique.mockResolvedValueOnce(null);
    await onFeedbackFlowCompleted(completion(true));

    db.loyaltyFeedbackRequest.findUnique.mockResolvedValueOnce(
      request({ program: { orgId: "org-2", feedbackSetting: null } }),
    );
    await onFeedbackFlowCompleted(completion(true));

    expect(db.loyaltyFeedbackRequest.updateMany).not.toHaveBeenCalled();
    expect(replyLoyalty).not.toHaveBeenCalled();
  });
});
