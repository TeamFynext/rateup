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
vi.mock("../../whatsapp/flows/flow.service.js", () => ({ sendFlow: vi.fn() }));
vi.mock("../../whatsapp/messageTemplates/wa_templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));
vi.mock("../loyaltyMessaging.js", () => ({ isCustomerSessionOpen: vi.fn() }));
vi.mock("./feedback.teamMap.js", () => ({ ensureSurveyTeamMap: vi.fn(async () => "stm-1") }));

import prisma from "../../../utils/prisma.js";
import { sendFlow } from "../../whatsapp/flows/flow.service.js";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller.js";
import { isCustomerSessionOpen } from "../loyaltyMessaging.js";
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
  vi.mocked(isCustomerSessionOpen).mockResolvedValue(false);
  vi.mocked(sendFlow).mockResolvedValue(true);
  vi.mocked(sendTemplateToUserCore).mockResolvedValue({ status: true, message: "ok" });
});

const lastUpdate = () => db.loyaltyFeedbackRequest.update.mock.calls.at(-1)![0].data;

describe("fireFeedbackRequest — the claim", () => {
  test("a row that is no longer SCHEDULED is skipped without a send", async () => {
    db.loyaltyFeedbackRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("skipped");
    expect(db.loyaltyFeedbackRequest.findUnique).not.toHaveBeenCalled();
    expect(sendFlow).not.toHaveBeenCalled();
    expect(sendTemplateToUserCore).not.toHaveBeenCalled();
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
    expect(sendFlow).not.toHaveBeenCalled();
    expect(sendTemplateToUserCore).not.toHaveBeenCalled();
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

describe("fireFeedbackRequest — delivery", () => {
  test("inside the service window sends the interactive flow with the request in its token", async () => {
    vi.mocked(isCustomerSessionOpen).mockResolvedValue(true);

    await expect(fireFeedbackRequest("req-1")).resolves.toBe("sent");
    expect(sendFlow).toHaveBeenCalledWith({
      orgId: "org-1",
      dbFlowId: "flow-1",
      phone: "15550001",
      context: { surveyTeamMapId: "stm-1", language: "en", feedbackRequestId: "req-1" },
    });
    expect(sendTemplateToUserCore).not.toHaveBeenCalled();
    expect(lastUpdate()).toEqual({ channel: "interactive" });
  });

  test("outside the window sends the FLOW-button template, threading the request id", async () => {
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("sent");
    expect(sendFlow).not.toHaveBeenCalled();

    const args = vi.mocked(sendTemplateToUserCore).mock.calls[0]!;
    expect(args[0]).toBe("org-1");
    expect(args[1]).toBe("tpl-1");
    expect(args[2]).toBe("15550001");
    expect(args[3]).toEqual([
      {
        type: "body",
        parameters: [
          { type: "text", text: "Priya" },
          { type: "text", text: "Kettle & Co" },
        ],
      },
    ]);
    expect(args[4]).toBe("team-1");
    expect(args[12]).toEqual({ feedbackRequestId: "req-1" });
    expect(lastUpdate()).toEqual({ channel: "template" });
  });

  test("outside the window with no approved template cancels rather than failing loudly", async () => {
    db.loyaltyFeedbackRequest.findUnique.mockResolvedValue(
      withSetting({ waTemplate: { id: "tpl-1", data: { status: "PENDING" } } }),
    );
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("cancelled");
    expect(lastUpdate().failReason).toMatch(/not approved/);
  });

  test("a refused interactive send is FAILED", async () => {
    vi.mocked(isCustomerSessionOpen).mockResolvedValue(true);
    vi.mocked(sendFlow).mockResolvedValue(false);
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("failed");
    expect(lastUpdate()).toEqual({ status: "FAILED", failReason: "WhatsApp send failed" });
  });

  test("a refused template send keeps Meta's message as the reason", async () => {
    vi.mocked(sendTemplateToUserCore).mockResolvedValue({
      status: false,
      message: "Template paused",
    });
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("failed");
    expect(lastUpdate()).toEqual({ status: "FAILED", failReason: "Template paused" });
  });

  test("a thrown send is FAILED with the error's message", async () => {
    vi.mocked(sendTemplateToUserCore).mockRejectedValue(new Error("conversation limit reached"));
    await expect(fireFeedbackRequest("req-1")).resolves.toBe("failed");
    expect(lastUpdate().failReason).toBe("conversation limit reached");
  });
});
