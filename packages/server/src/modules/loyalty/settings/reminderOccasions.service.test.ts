import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    $queryRaw: vi.fn(),
    customerLoyaltyAccount: { updateMany: vi.fn(), findUnique: vi.fn() },
    loyaltyRedemption: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../messaging/send.js", () => ({ sendLoyaltyEvent: vi.fn() }));
vi.mock("../accounts/account.service.js", () => ({ assignRewardToCustomer: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import { assignRewardToCustomer } from "../accounts/account.service.js";
import { sendLoyaltyEvent } from "../messaging/send.js";
import {
  checkRewardExpiringAlerts,
  checkSignupAnniversaries,
  checkTierAtRiskAlerts,
  type ReminderProgram,
  type ReminderTrigger,
} from "./reminderOccasions.service.js";
import { DEFAULT_SEND_HOUR } from "./reminderSchedule.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  $queryRaw: Mock;
  customerLoyaltyAccount: Record<string, Mock>;
  loyaltyRedemption: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const NOW = new Date(Date.UTC(2026, 4, 15, DEFAULT_SEND_HOUR));

const program: ReminderProgram = {
  id: "prog-1",
  name: "Rewards",
  orgId: ORG,
  timezone: "Etc/UTC",
  status: "active",
  whatsappNotifications: true,
  pointsActivityAlerts: true,
  sendTextInSession: true,
  enabledChannels: ["WHATSAPP"],
  tierQualificationWindowMonths: 12,
};
const trigger: ReminderTrigger = { rewardId: null, leadDays: null, sendHour: null };
const contact = { name: "Ann", phone: "919000000001", orgId: ORG };

const sendFails = () =>
  (sendLoyaltyEvent as Mock).mockResolvedValue({ sent: false, skippedReason: "send_failed" });

beforeEach(() => {
  vi.clearAllMocks();
  db.customerLoyaltyAccount.updateMany.mockResolvedValue({ count: 1 });
  db.loyaltyRedemption.updateMany.mockResolvedValue({ count: 1 });
  (sendLoyaltyEvent as Mock).mockResolvedValue({ sent: true, skippedReason: null });
});

describe("checkTierAtRiskAlerts", () => {
  const previous = new Date(2026, 0, 1);
  beforeEach(() => {
    db.$queryRaw.mockResolvedValue([
      { accountId: "acct-1", shortfall: "1200.40", tierName: "Gold", previousAlertAt: previous },
    ]);
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ contact });
  });

  test("warns the member with their tier, the days left and what they still need", async () => {
    expect(await checkTierAtRiskAlerts(program, trigger, NOW)).toBe(1);

    expect(sendLoyaltyEvent).toHaveBeenCalledWith(
      ORG,
      LoyaltyEventType.TIER_AT_RISK,
      { accountId: "acct-1" },
      { name: "Ann", tier: "Gold", days: "30", amount: "1200" },
      { program },
    );
  });

  test("a failed send is not counted and hands its claim back", async () => {
    sendFails();

    expect(await checkTierAtRiskAlerts(program, trigger, NOW)).toBe(0);

    const claimedAt =
      db.customerLoyaltyAccount.updateMany.mock.calls[0][0].data.lastTierAtRiskAlertAt;
    expect(db.customerLoyaltyAccount.updateMany.mock.calls[1][0]).toEqual({
      where: { id: "acct-1", lastTierAtRiskAlertAt: claimedAt },
      data: { lastTierAtRiskAlertAt: previous },
    });
  });

  test("a message that was never going to go keeps its claim", async () => {
    (sendLoyaltyEvent as Mock).mockResolvedValue({ sent: false, skippedReason: "no_template" });

    expect(await checkTierAtRiskAlerts(program, trigger, NOW)).toBe(0);
    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe("checkRewardExpiringAlerts", () => {
  beforeEach(() => {
    db.loyaltyRedemption.findMany.mockResolvedValue([
      {
        id: "red-1",
        redemptionCode: "K4P2",
        expiresAt: new Date(2026, 4, 18),
        reward: { name: "free coffee" },
        account: { id: "acct-1", contact },
      },
    ]);
  });

  test("names the reward, its date and its code", async () => {
    expect(await checkRewardExpiringAlerts(program, trigger, NOW)).toBe(1);

    expect((sendLoyaltyEvent as Mock).mock.calls[0][3]).toEqual({
      name: "Ann",
      rewardName: "free coffee",
      date: "18 May 2026",
      code: "K4P2",
    });
  });

  test("a failed send clears the redemption's marker so it is tried again", async () => {
    sendFails();

    expect(await checkRewardExpiringAlerts(program, trigger, NOW)).toBe(0);
    expect(db.loyaltyRedemption.updateMany.mock.calls[1][0]).toEqual({
      where: { id: "red-1" },
      data: { expiryNotifiedAt: null },
    });
  });
});

describe("checkSignupAnniversaries", () => {
  const previous = new Date(2025, 4, 15);
  beforeEach(() => {
    db.$queryRaw.mockResolvedValue([{ id: "acct-1", years: 2, previousGreetedAt: previous }]);
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ currentPoints: 1283, contact });
  });

  test("greets the member and issues the gift", async () => {
    expect(await checkSignupAnniversaries(program, { ...trigger, rewardId: "rwd-1" }, NOW)).toBe(1);

    expect((sendLoyaltyEvent as Mock).mock.calls[0][3]).toEqual({
      name: "Ann",
      years: "2",
      balance: "1283",
    });
    expect(assignRewardToCustomer).toHaveBeenCalledWith("acct-1", "rwd-1");
  });

  test("a failed greeting with no gift hands its claim back", async () => {
    sendFails();

    expect(await checkSignupAnniversaries(program, trigger, NOW)).toBe(0);
    expect(db.customerLoyaltyAccount.updateMany.mock.calls[1][0]).toMatchObject({
      where: { id: "acct-1" },
      data: { lastAnniversaryGreetedAt: previous },
    });
  });

  // The gift goes out regardless, so retrying would try to give it a second time.
  test("a failed greeting that carries a gift keeps its claim", async () => {
    sendFails();

    await checkSignupAnniversaries(program, { ...trigger, rewardId: "rwd-1" }, NOW);

    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalledTimes(1);
    expect(assignRewardToCustomer).toHaveBeenCalled();
  });
});
