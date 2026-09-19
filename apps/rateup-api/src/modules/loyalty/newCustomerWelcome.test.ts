import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    loyaltyEventTrigger: { findFirst: vi.fn() },
    waMessage: { findMany: vi.fn() },
    customerLoyaltyAccount: { findFirst: vi.fn() },
  },
}));
vi.mock("./messaging/send.js", () => ({ sendLoyaltyEvent: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { LoyaltyEventType } from "../../types/enums.js";
import { sendLoyaltyEvent } from "./messaging/send.js";
import { sendNewCustomerWelcomeIfDue } from "./newCustomerWelcome.js";

/** The `sendLoyaltyEvent` call made for `event`: org, recipient, data and options. */
function sentEvent(event: string) {
  const call = (sendLoyaltyEvent as unknown as { mock: { calls: unknown[][] } }).mock.calls.find(
    (args) => args[1] === event,
  );
  return call && { orgId: call[0], to: call[2], data: call[3], options: call[4] };
}

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;

const input = { orgId: "org-1", contactId: "contact-1", phone: "919000000000", name: "Anjali" };

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyEventTrigger.findFirst.mockResolvedValue({ id: "trigger-1" });
  db.waMessage.findMany.mockResolvedValue([{ id: "m1" }]);
  db.customerLoyaltyAccount.findFirst.mockResolvedValue(null);
  (sendLoyaltyEvent as Mock).mockResolvedValue({ sent: true });
});

describe("sendNewCustomerWelcomeIfDue", () => {
  test("welcomes a non-member on their first message", async () => {
    await expect(sendNewCustomerWelcomeIfDue(input)).resolves.toBe(true);
    expect(sendLoyaltyEvent).toHaveBeenCalledWith(
      "org-1",
      LoyaltyEventType.NEW_CUSTOMER_WELCOME,
      { contactId: "contact-1", name: "Anjali" },
      { name: "Anjali" },
    );
  });

  test("greets a contact with no profile name as 'there'", async () => {
    await sendNewCustomerWelcomeIfDue({ ...input, name: "  " });
    expect(sentEvent(LoyaltyEventType.NEW_CUSTOMER_WELCOME)?.data).toEqual({ name: "there" });
  });

  test("stays quiet once the contact has written before", async () => {
    db.waMessage.findMany.mockResolvedValue([{ id: "m1" }, { id: "m2" }]);
    await expect(sendNewCustomerWelcomeIfDue(input)).resolves.toBe(false);
    expect(sendLoyaltyEvent).not.toHaveBeenCalled();
  });

  test("skips a contact who already has a loyalty account", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue({ id: "acct-1" });
    await expect(sendNewCustomerWelcomeIfDue(input)).resolves.toBe(false);
    expect(sendLoyaltyEvent).not.toHaveBeenCalled();
  });

  test("does nothing when the welcome is not switched on", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue(null);
    await expect(sendNewCustomerWelcomeIfDue(input)).resolves.toBe(false);
    expect(db.waMessage.findMany).not.toHaveBeenCalled();
  });
});
