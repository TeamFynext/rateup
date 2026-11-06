import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    $queryRaw: vi.fn(),
    usageStats: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    subscriptionAddon: { findMany: vi.fn(() => Promise.resolve([])) },
  },
}));

// The suspension lookup has its own tests in modules/org/orgSuspension.test.ts.
vi.mock("../../org/orgSuspension.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../org/orgSuspension.js")>();
  return { ...actual, isOrgSuspended: vi.fn() };
});
vi.mock("../../subscription/campaignCredits.js", () => ({ consumeCampaignCredit: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { isOrgSuspended } from "../../org/orgSuspension.js";
import { currentPeriodStart } from "../../subscription/billingPeriod.js";
import { consumeCampaignCredit } from "../../subscription/campaignCredits.js";
import {
  ActiveContactLimitError,
  assertCampaignCredit,
  assertCanMessageContact,
  CampaignCreditsExhaustedError,
  OrgSuspendedError,
} from "./wasurvey.auth.js";

const queryRaw = vi.mocked(prisma.$queryRaw);
const recipient = { platform: "WHATSAPP" as const, customerId: "919876543210" };

function seed({ used, max = 100 }: { used: number; max?: number }) {
  vi.mocked(prisma.usageStats.findUnique).mockResolvedValue({
    activeContactsCount: used,
    activeContactsPeriodStart: currentPeriodStart(),
  } as never);
  vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
    features: { whatsapp: { activeContacts: { active: true, count: { max } } } },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  queryRaw.mockReset();
  vi.mocked(isOrgSuspended).mockResolvedValue(false);
});

describe("the limit errors", () => {
  test("ActiveContactLimitError is a 403 the client can recognise", () => {
    const err = new ActiveContactLimitError();
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("ACTIVE_CONTACT_LIMIT_REACHED");
    expect(err.name).toBe("ActiveContactLimitError");
    expect(err.message).toMatch(/active contacts/i);
  });

  test("CampaignCreditsExhaustedError is a 403 the client can recognise", () => {
    const err = new CampaignCreditsExhaustedError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("CAMPAIGN_CREDITS_EXHAUSTED");
    expect(err.message).toMatch(/campaign credits/i);
  });

  test("accept a custom message", () => {
    expect(new ActiveContactLimitError("custom").message).toBe("custom");
  });
});

describe("assertCanMessageContact", () => {
  test("allows any recipient under the allowance without looking them up", async () => {
    seed({ used: 99 });
    await expect(assertCanMessageContact("org", recipient)).resolves.toBeUndefined();
    expect(queryRaw).not.toHaveBeenCalled();
  });

  test("allows a contact already counted this month once the allowance is spent", async () => {
    seed({ used: 100 });
    queryRaw.mockResolvedValueOnce([{ hit: 1 }] as never);
    await expect(assertCanMessageContact("org", recipient)).resolves.toBeUndefined();
  });

  test("refuses a new contact once the allowance is spent", async () => {
    seed({ used: 100 });
    queryRaw.mockResolvedValueOnce([] as never);
    await expect(assertCanMessageContact("org", recipient)).rejects.toBeInstanceOf(
      ActiveContactLimitError,
    );
  });

  test("refuses a suspended account before the allowance is even read", async () => {
    seed({ used: 0 });
    vi.mocked(isOrgSuspended).mockResolvedValue(true);
    await expect(assertCanMessageContact("org", recipient)).rejects.toBeInstanceOf(
      OrgSuspendedError,
    );
    expect(prisma.usageStats.findUnique).not.toHaveBeenCalled();
  });
});

describe("assertCampaignCredit", () => {
  test("resolves when a credit was spent", async () => {
    vi.mocked(consumeCampaignCredit).mockResolvedValue(true);
    await expect(assertCampaignCredit("org")).resolves.toBeUndefined();
  });

  test("throws CampaignCreditsExhaustedError when none is left", async () => {
    vi.mocked(consumeCampaignCredit).mockResolvedValue(false);
    await expect(assertCampaignCredit("org")).rejects.toBeInstanceOf(CampaignCreditsExhaustedError);
  });

  test("refuses a suspended account without spending a credit", async () => {
    vi.mocked(isOrgSuspended).mockResolvedValue(true);
    await expect(assertCampaignCredit("org")).rejects.toBeInstanceOf(OrgSuspendedError);
    expect(consumeCampaignCredit).not.toHaveBeenCalled();
  });
});
