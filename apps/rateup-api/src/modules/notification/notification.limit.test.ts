import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { subscription: { findUnique: vi.fn() } },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
// Keep the mobile-notification SDK out of the import graph for this unit test.
vi.mock("../mobileNotification/mobile.service.js", () => ({ sendPushNotification: vi.fn() }));
vi.mock("../../utils/email/sendAWSEmail.js", () => ({ sendAWSEmail: vi.fn() }));
vi.mock("../../utils/email/payments/usageLimitAlert.js", () => ({
  sendUsageLimitMailAlert: vi.fn(),
}));
vi.mock("./notify.js", () => ({ notify: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { sendUsageLimitMailAlert } from "../../utils/email/payments/usageLimitAlert.js";
import { notify } from "./notify.js";
import { notifyConversationLimitReached } from "./notification.service.js";

const subscriptionMock = prisma.subscription.findUnique as unknown as ReturnType<typeof vi.fn>;
const notifyMock = notify as unknown as ReturnType<typeof vi.fn>;

/** A gateway-billed tier: the org can act on "upgrade your plan". */
const PAID = {
  basePlan: {
    paymentPlanId: "plan_1",
    monthlyPaymentPlanId: null,
    yearlyPaymentPlanId: null,
    stripeId: null,
  },
};
/** Enterprise: sales-led, so its limit came from a contract rather than a tier. */
const SALES_LED = {
  basePlan: {
    paymentPlanId: null,
    monthlyPaymentPlanId: null,
    yearlyPaymentPlanId: null,
    stripeId: null,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  subscriptionMock.mockResolvedValue(PAID);
});

describe("notifyConversationLimitReached", () => {
  test("goes to everyone who receives billing alerts, with an upgrade message", async () => {
    await notifyConversationLimitReached("org-1");

    expect(notifyMock).toHaveBeenCalledTimes(1);
    const input = notifyMock.mock.calls[0][0];
    expect(input.event).toBe("billing.conversation_limit");
    expect(input.orgId).toBe("org-1");
    expect(input.audience).toEqual({ kind: "permitted" });
    expect(input.data.message).toMatch(/upgrade your plan/i);
  });

  test("a contracted account is pointed at us, not at an upgrade that does not exist", async () => {
    // Enterprise is unlimited until a deal caps it. Reaching that cap is real — the send
    // gate stops there — but there is no higher tier to buy, so the copy has to differ.
    subscriptionMock.mockResolvedValue(SALES_LED);

    await notifyConversationLimitReached("org-1");

    const message = notifyMock.mock.calls[0][0].data.message;
    expect(message).toMatch(/limit set on your agreement/i);
    expect(message).not.toMatch(/upgrade/i);
  });

  test("mails the owner whatever the notification settings say", async () => {
    await notifyConversationLimitReached("org-1");
    expect(sendUsageLimitMailAlert).toHaveBeenCalledWith("org-1");
  });

  test("is best-effort: swallows errors instead of throwing", async () => {
    subscriptionMock.mockRejectedValue(new Error("db down"));
    await expect(notifyConversationLimitReached("org-1")).resolves.toBeUndefined();
  });
});
