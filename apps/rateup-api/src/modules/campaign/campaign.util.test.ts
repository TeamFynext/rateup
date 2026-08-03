import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { campaign: { count: vi.fn() } },
  excludeFields: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { verifyCampaignMaxLimit } from "./campaign.util.js";

type Mock = ReturnType<typeof vi.fn>;

const countMock = (prisma as unknown as { campaign: { count: Mock } }).campaign.count;

function request(features: unknown = { whatsapp: { count: { max: 3 } } }): any {
  return { user: { orgId: "org-1" }, subscription: { features } };
}

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

beforeEach(() => {
  vi.clearAllMocks();
  countMock.mockResolvedValue(0);
});

describe("verifyCampaignMaxLimit", () => {
  test("lets an org under its campaign limit through", async () => {
    countMock.mockResolvedValue(2);
    const rep = reply();

    await verifyCampaignMaxLimit(request(), rep);

    expect(rep.code).not.toHaveBeenCalled();
  });

  test("counts campaigns across every team in the caller's org", async () => {
    await verifyCampaignMaxLimit(request(), reply());

    expect(countMock.mock.calls[0][0]).toEqual({ where: { team: { orgId: "org-1" } } });
  });

  test("refuses an org that has reached its limit, naming the limit", async () => {
    countMock.mockResolvedValue(3);
    const rep = reply();

    await verifyCampaignMaxLimit(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(403);
    expect(rep.send.mock.calls[0][0].message).toBe(
      "You have reached the maximum limit of 3 campaigns.",
    );
  });

  test("refuses an org with no subscription at all", async () => {
    const rep = reply();

    await verifyCampaignMaxLimit({ user: { orgId: "org-1" }, subscription: null } as any, rep);

    expect(rep.code).toHaveBeenCalledWith(403);
    expect(rep.send.mock.calls[0][0].message).toBe("Subscription not found");
  });

  // The third copy of the same defect, after(flows) and 14.7
  // (templates) — and a fourth in the automated-replies gate. All four share
  // enforceWhatsappCountLimit now. A plan that states no maximum means no limit,
  // and saying so explicitly is what stops the next reader taking
  // `count >= undefined` for a check.
  test("enforces no limit when the plan does not state one, without counting", async () => {
    const rep = reply();

    await verifyCampaignMaxLimit(request({ whatsapp: { active: true } }), rep);

    expect(rep.code).not.toHaveBeenCalled();
    expect(countMock).not.toHaveBeenCalled();
  });

  // The count query sat inside the try, so a database outage was answered as a 403
  // carrying the raw error text with displayMessageInClient set — an infrastructure
  // failure dressed up as a permission refusal, shown to the user. It is outside
  // any catch now, so it surfaces as a 500.
  test("lets a database failure surface rather than calling it a refusal", async () => {
    countMock.mockRejectedValue(new Error("connection terminated unexpectedly"));
    const rep = reply();

    await expect(verifyCampaignMaxLimit(request(), rep)).rejects.toThrow(
      "connection terminated unexpectedly",
    );
    expect(rep.code).not.toHaveBeenCalled();
  });
});
