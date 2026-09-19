import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyFeedbackRequest: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../messaging/send.js", () => ({ sendLoyalty: vi.fn() }));
vi.mock("./feedback.teamMap.js", () => ({ ensureSurveyTeamMap: vi.fn(async () => "stm-1") }));

import prisma from "../../../utils/prisma.js";
import { sendLoyalty } from "../messaging/send.js";
import { fireFeedbackRequest } from "./feedback.sender.js";

const db = prisma as unknown as {
  loyaltyFeedbackRequest: {
    updateMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function loaded(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-1",
    accountId: "acct-1",
    program: {
      id: "prog-1",
      orgId: "org-1",
      status: "active",
      name: "Kettle Rewards",
      businessName: "Kettle & Co",
      feedbackSetting: {
        enabled: true,
        teamId: "team-1",
        cooldownDays: 30,
        flow: {
          dbFlowId: "flow-1",
          status: "PUBLISHED",
          surveyId: "survey-1",
          whatsappSettingsId: null,
        },
        waTemplate: { id: "tpl-1", data: { status: "APPROVED" } },
      },
    },
    account: { status: "active", contact: { phone: "15550001", name: "Priya" } },
    ...overrides,
  };
}

const withSetting = (setting: Record<string, unknown>) =>
  loaded({
    program: {
      ...loaded().program,
      feedbackSetting: { ...loaded().program.feedbackSetting, ...setting },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyFeedbackRequest.updateMany.mockResolvedValue({ count: 1 });
  db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(loaded());
  db.loyaltyFeedbackRequest.findFirst.mockResolvedValue(null);
  db.loyaltyFeedbackRequest.update.mockResolvedValue({});
  vi.mocked(sendLoyalty).mockResolvedValue({
    sent: true,
    channel: "whatsapp",
    mode: "template",
    templateId: "tpl-1",
    text: null,
    skippedReason: null,
  });
});

const lastUpdate = () => db.loyaltyFeedbackRequest.update.mock.calls.at(-1)![0].data;

describe("fireFeedbackRequest — the claim", () => {
  test("a row that is no longer SCHEDULED is skipped without a send", async () => {
    db.loyaltyFeedbackRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("skipped");
    expect(db.loyaltyFeedbackRequest.findUnique).not.toHaveBeenCalled();
    expect(sendLoyalty).not.toHaveBeenCalled();
  });

  test("claims with a conditional update to SENT", async () => {
    await fireFeedbackRequest("req-1");
    expect(db.loyaltyFeedbackRequest.updateMany).toHaveBeenCalledWith({
      where: { id: "req-1", status: "SCHEDULED" },
      data: expect.objectContaining({ status: "SENT" }),
    });
  });
});

describe("fireFeedbackRequest — re-checks after the delay", () => {
  test.each([
    [
      "Feedback has been removed",
      withSetting({}) && loaded({ program: { ...loaded().program, feedbackSetting: null } }),
    ],
    ["Feedback is switched off", withSetting({ enabled: false })],
    ["Programme is not active", loaded({ program: { ...loaded().program, status: "paused" } })],
    [
      "Flow is not published",
      withSetting({ flow: { ...loaded().program.feedbackSetting.flow, status: "DRAFT" } }),
    ],
    [
      "Customer account is not active",
      loaded({ account: { status: "closed", contact: { phone: "1", name: "x" } } }),
    ],
    [
      "Customer has no phone number",
      loaded({ account: { status: "active", contact: { phone: null, name: "x" } } }),
    ],
  ])("cancels with %s", async (reason, row) => {
    db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(row);
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("cancelled");
    expect(lastUpdate()).toEqual({ status: "CANCELLED", failReason: reason });
    expect(sendLoyalty).not.toHaveBeenCalled();
  });

  test("a sibling request sent inside the cooldown stands this one down", async () => {
    db.loyaltyFeedbackRequest.findFirst.mockResolvedValue({ id: "req-0" });
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("cancelled");
    expect(db.loyaltyFeedbackRequest.findFirst.mock.calls[0]![0].where.id).toEqual({
      not: "req-1",
    });
    expect(lastUpdate().failReason).toMatch(/cooldown/);
  });
});

// Which of the two goes out — the flow inside the window, the FLOW-button template
// outside it — is the channel's decision; see the WhatsApp adapter's tests.
describe("fireFeedbackRequest — delivery", () => {
  const outcome = (over: Record<string, unknown>) =>
    vi.mocked(sendLoyalty).mockResolvedValue({
      sent: false,
      channel: "whatsapp",
      mode: null,
      templateId: null,
      text: null,
      skippedReason: null,
      ...over,
    });

  test("offers the flow and its template, both carrying the request id", async () => {
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("sent");

    expect(sendLoyalty).toHaveBeenCalledWith({
      orgId: "org-1",
      to: { accountId: "acct-1" },
      intent: { kind: "notify" },
      message: {
        key: "feedback_request",
        text: null,
        parts: {
          flow: {
            dbFlowId: "flow-1",
            context: { surveyTeamMapId: "stm-1", language: "en", feedbackRequestId: "req-1" },
          },
        },
        artefacts: {
          WHATSAPP: {
            waTemplateId: "tpl-1",
            params: ["Priya", "Kettle & Co"],
            teamId: "team-1",
            flowContext: { feedbackRequestId: "req-1" },
          },
        },
      },
    });
  });

  test("records which way it went", async () => {
    await fireFeedbackRequest("req-1");
    expect(lastUpdate()).toEqual({ channel: "template" });

    outcome({ sent: true, mode: "interactive" });
    await fireFeedbackRequest("req-1");
    expect(lastUpdate()).toEqual({ channel: "interactive" });
  });

  test("with no template to fall back on, only the flow is offered", async () => {
    db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(withSetting({ waTemplate: null }));

    await fireFeedbackRequest("req-1");

    expect(vi.mocked(sendLoyalty).mock.calls[0]![0].message).not.toHaveProperty("artefacts");
  });

  test("a message that could not go cancels rather than failing loudly", async () => {
    outcome({ skippedReason: "template_not_approved" });
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("cancelled");
    expect(lastUpdate().failReason).toMatch(/not approved/);
  });

  test("a refused send is FAILED with the channel's reason", async () => {
    outcome({ skippedReason: "send_failed", error: "Template paused" });
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("failed");
    expect(lastUpdate()).toEqual({ status: "FAILED", failReason: "Template paused" });

    outcome({ skippedReason: "send_failed" });
    await fireFeedbackRequest("req-1");
    expect(lastUpdate()).toEqual({ status: "FAILED", failReason: "WhatsApp send failed" });
  });

  test("a thrown send is FAILED with the error's message", async () => {
    vi.mocked(sendLoyalty).mockRejectedValue(new Error("conversation limit reached"));
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("failed");
    expect(lastUpdate().failReason).toBe("conversation limit reached");
  });
});
