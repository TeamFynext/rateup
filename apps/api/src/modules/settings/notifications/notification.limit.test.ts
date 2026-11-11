import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({
  default: { subscription: { findUnique: vi.fn() } },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
// Keep the mobile-notification SDK out of the import graph for this unit test.
vi.mock("../mobileNotifications/mobile.service.js", () => ({ sendPushNotification: vi.fn() }));
vi.mock("../../../utils/email/sendAWSEmail.js", () => ({ sendAWSEmail: vi.fn() }));
vi.mock("../../../utils/email/payments/usageLimitAlert.js", () => ({
  sendUsageLimitMailAlert: vi.fn(),
}));
vi.mock("./notify.js", () => ({ notify: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { sendUsageLimitMailAlert } from "../../../utils/email/payments/usageLimitAlert.js";
import { notify } from "./notify.js";
import { notifyLimitReached, notifyOrderLimitNearing } from "./notification.service.js";

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

describe("notifyLimitReached", () => {
  test.each([
    ["activeContacts", "billing.active_contact_limit", /contact pack/i],
    ["campaignCredits", "billing.campaign_credit_limit", /credit pack/i],
    ["shopOrders", "billing.shop_order_limit", /keep taking orders/i],
  ] as const)(
    "%s goes to everyone who receives billing alerts, with an upgrade message",
    async (limit, event, pack) => {
      await notifyLimitReached("org-1", limit);

      expect(notifyMock).toHaveBeenCalledTimes(1);
      const input = notifyMock.mock.calls[0][0];
      expect(input.event).toBe(event);
      expect(input.orgId).toBe("org-1");
      expect(input.audience).toEqual({ kind: "permitted" });
      expect(input.data.message).toMatch(/upgrade/i);
      expect(input.data.message).toMatch(pack);
    },
  );

  test("a contracted account is pointed at us, not at an upgrade that does not exist", async () => {
    // Enterprise has no higher tier to buy, so the copy has to differ.
    subscriptionMock.mockResolvedValue(SALES_LED);

    await notifyLimitReached("org-1", "activeContacts");

    const message = notifyMock.mock.calls[0][0].data.message;
    expect(message).toMatch(/set on your agreement/i);
    expect(message).not.toMatch(/upgrade/i);
  });

  test("Free links no gateway but can still upgrade, so it is told to", async () => {
    subscriptionMock.mockResolvedValue({ basePlan: { ...SALES_LED.basePlan, name: "FREE PLAN" } });

    await notifyLimitReached("org-1", "shopOrders");

    expect(notifyMock.mock.calls[0][0].data.message).toMatch(/upgrade/i);
  });

  test("mails the owner and admins whatever the notification settings say", async () => {
    await notifyLimitReached("org-1", "campaignCredits");
    expect(sendUsageLimitMailAlert).toHaveBeenCalledWith("org-1", "campaignCredits");
  });

  test("is best-effort: swallows errors instead of throwing", async () => {
    subscriptionMock.mockRejectedValue(new Error("db down"));
    await expect(notifyLimitReached("org-1", "activeContacts")).resolves.toBeUndefined();
  });
});

describe("notifyOrderLimitNearing", () => {
  test("warns in the app with the numbers, and sends no email", async () => {
    await notifyOrderLimitNearing("org-1", 40, 50);

    const input = notifyMock.mock.calls[0][0];
    expect(input.event).toBe("billing.shop_order_limit");
    expect(input.data).toEqual({
      message: expect.stringContaining("40 of its 50 orders"),
      reached: false,
    });
    expect(sendUsageLimitMailAlert).not.toHaveBeenCalled();
  });
});
