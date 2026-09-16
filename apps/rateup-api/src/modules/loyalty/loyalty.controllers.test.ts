import { beforeEach, describe, expect, test, vi } from "vitest";

// The four admin CRUD controllers — program, tiers, rewards and earning rules —
// share one shape: create/list resolve the program from the session, and
// get-by-id / update / delete take the path id straight through.
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./program/program.service.js", () => ({
  createLoyaltyProgram: vi.fn(),
  deleteLoyaltyProgram: vi.fn(),
  getLoyaltyProgramByOrg: vi.fn(),
  updateLoyaltyProgram: vi.fn(),
  resetProgramPoints: vi.fn(),
}));

vi.mock("./tiers/tier.service.js", () => ({
  createLoyaltyTier: vi.fn(),
  deleteLoyaltyTier: vi.fn(),
  getLoyaltyTierById: vi.fn(),
  getLoyaltyTiers: vi.fn(),
  updateLoyaltyTier: vi.fn(),
}));

vi.mock("./rewards/reward.service.js", () => ({
  createLoyaltyReward: vi.fn(),
  deleteLoyaltyReward: vi.fn(),
  getActiveLoyaltyRewards: vi.fn(),
  getLoyaltyRewardById: vi.fn(),
  getLoyaltyRewards: vi.fn(),
  updateLoyaltyReward: vi.fn(),
}));

vi.mock("./earningRules/earningRule.service.js", () => ({
  createLoyaltyEarningRule: vi.fn(),
  deleteLoyaltyEarningRule: vi.fn(),
  getActiveLoyaltyEarningRules: vi.fn(),
  getLoyaltyEarningRuleById: vi.fn(),
  getLoyaltyEarningRules: vi.fn(),
  updateLoyaltyEarningRule: vi.fn(),
}));

vi.mock("./dashboard/dashboard.service.js", () => ({ getLoyaltyDashboardStats: vi.fn() }));

import {
  createLoyaltyProgram,
  deleteLoyaltyProgram,
  getLoyaltyProgramByOrg,
  resetProgramPoints,
  updateLoyaltyProgram,
} from "./program/program.service.js";
import {
  createLoyaltyTier,
  deleteLoyaltyTier,
  getLoyaltyTierById,
  getLoyaltyTiers,
  updateLoyaltyTier,
} from "./tiers/tier.service.js";
import {
  createLoyaltyReward,
  deleteLoyaltyReward,
  getActiveLoyaltyRewards,
  getLoyaltyRewardById,
  getLoyaltyRewards,
  updateLoyaltyReward,
} from "./rewards/reward.service.js";
import {
  createLoyaltyEarningRule,
  deleteLoyaltyEarningRule,
  getActiveLoyaltyEarningRules,
  getLoyaltyEarningRuleById,
  getLoyaltyEarningRules,
  updateLoyaltyEarningRule,
} from "./earningRules/earningRule.service.js";
import { getLoyaltyDashboardStats } from "./dashboard/dashboard.service.js";

import {
  createLoyaltyProgramHandler,
  deleteLoyaltyProgramHandler,
  getLoyaltyProgramHandler,
  resetProgramPointsHandler,
  updateLoyaltyProgramHandler,
} from "./program/program.controller.js";
import {
  createLoyaltyTierHandler,
  deleteLoyaltyTierHandler,
  getLoyaltyTierByIdHandler,
  getLoyaltyTiersHandler,
  updateLoyaltyTierHandler,
} from "./tiers/tier.controller.js";
import {
  createLoyaltyRewardHandler,
  deleteLoyaltyRewardHandler,
  getLoyaltyRewardByIdHandler,
  getLoyaltyRewardsHandler,
  updateLoyaltyRewardHandler,
} from "./rewards/reward.controller.js";
import {
  createLoyaltyEarningRuleHandler,
  deleteLoyaltyEarningRuleHandler,
  getLoyaltyEarningRuleByIdHandler,
  getLoyaltyEarningRulesHandler,
  updateLoyaltyEarningRuleHandler,
} from "./earningRules/earningRule.controller.js";
import { getLoyaltyDashboardStatsHandler } from "./dashboard/dashboard.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "user-1";
const PROGRAM = "prog-1";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function request(over: Record<string, unknown> = {}): any {
  return { user: { orgId: ORG, userId: USER }, params: {}, query: {}, body: {}, ...over };
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks drops recorded calls but KEEPS implementations, so every mock a
  // test points at a rejection has to be re-armed here or the next test inherits it.
  (getLoyaltyProgramByOrg as Mock).mockResolvedValue({ id: PROGRAM });
  (deleteLoyaltyProgram as Mock).mockResolvedValue(undefined);
  (resetProgramPoints as Mock).mockResolvedValue(undefined);
  (updateLoyaltyProgram as Mock).mockResolvedValue({});
  (createLoyaltyProgram as Mock).mockResolvedValue({});
  (deleteLoyaltyTier as Mock).mockResolvedValue(undefined);
  (updateLoyaltyTier as Mock).mockResolvedValue({});
  (getLoyaltyTierById as Mock).mockResolvedValue({});
  (getLoyaltyTiers as Mock).mockResolvedValue([]);
  (createLoyaltyTier as Mock).mockResolvedValue({});
  (deleteLoyaltyReward as Mock).mockResolvedValue(undefined);
  (updateLoyaltyReward as Mock).mockResolvedValue({});
  (getLoyaltyRewardById as Mock).mockResolvedValue({});
  (getLoyaltyRewards as Mock).mockResolvedValue([]);
  (getActiveLoyaltyRewards as Mock).mockResolvedValue([]);
  (createLoyaltyReward as Mock).mockResolvedValue({});
  (deleteLoyaltyEarningRule as Mock).mockResolvedValue(undefined);
  (updateLoyaltyEarningRule as Mock).mockResolvedValue({});
  (getLoyaltyEarningRuleById as Mock).mockResolvedValue({});
  (getLoyaltyEarningRules as Mock).mockResolvedValue([]);
  (getActiveLoyaltyEarningRules as Mock).mockResolvedValue([]);
  (createLoyaltyEarningRule as Mock).mockResolvedValue({});
  (getLoyaltyDashboardStats as Mock).mockResolvedValue({});
});

// ===========================================================================
// program
// ===========================================================================

describe("the program controller", () => {
  test("creates the program against the session org", async () => {
    (createLoyaltyProgram as Mock).mockResolvedValue({ id: PROGRAM });
    const rep = reply();

    await createLoyaltyProgramHandler(request({ body: { name: "Rewards" } }), rep);

    expect(createLoyaltyProgram).toHaveBeenCalledWith({ name: "Rewards" }, ORG);
    expect(answer(rep)).toEqual({ code: 201, body: { id: PROGRAM } });
  });

  test("reports a duplicate program with the service's own message", async () => {
    (createLoyaltyProgram as Mock).mockRejectedValue(
      new Error("Loyalty program already exists for this organization"),
    );
    const rep = reply();

    await createLoyaltyProgramHandler(request({ body: {} }), rep);

    expect(answer(rep)).toEqual({
      code: 500,
      body: { error: "Loyalty program already exists for this organization" },
    });
  });

  test("reads the program by org", async () => {
    const rep = reply();

    await getLoyaltyProgramHandler(request(), rep);

    expect(getLoyaltyProgramByOrg).toHaveBeenCalledWith(ORG);
    expect(answer(rep).code).toBe(200);
  });

  test("answers 404 when the org has no program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await getLoyaltyProgramHandler(request(), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Loyalty program not found" } });
  });

  test("carries the caller's org into the update", async () => {
    (updateLoyaltyProgram as Mock).mockResolvedValue({ id: "prog-other" });

    await updateLoyaltyProgramHandler(
      request({ params: { programId: "prog-other" }, body: { signupBonus: 99999 } }),
      reply(),
    );

    expect(updateLoyaltyProgram).toHaveBeenCalledWith("prog-other", { signupBonus: 99999 }, ORG);
  });

  test("deletes without force by default", async () => {
    const rep = reply();

    await deleteLoyaltyProgramHandler(request({ params: { programId: PROGRAM }, query: {} }), rep);

    expect(deleteLoyaltyProgram).toHaveBeenCalledWith(PROGRAM, ORG, undefined);
    expect(answer(rep).code).toBe(204);
  });

  test("passes a force flag from the query string straight through", async () => {
    await deleteLoyaltyProgramHandler(
      request({ params: { programId: PROGRAM }, query: { force: true } }),
      reply(),
    );

    expect(deleteLoyaltyProgram).toHaveBeenCalledWith(PROGRAM, ORG, true);
  });

  test("reports a refused delete as a 500 with the reason", async () => {
    (deleteLoyaltyProgram as Mock).mockRejectedValue(
      new Error("Cannot delete program with existing customers. Archive it instead."),
    );
    const rep = reply();

    await deleteLoyaltyProgramHandler(request({ params: { programId: PROGRAM } }), rep);

    expect(answer(rep).code).toBe(500);
  });

  test("resets a program's points within the caller's org, recording the actor", async () => {
    const rep = reply();

    await resetProgramPointsHandler(request({ params: { programId: "prog-other" } }), rep);

    expect(resetProgramPoints).toHaveBeenCalledWith("prog-other", ORG, USER);
    expect(answer(rep)).toEqual({ code: 200, body: { message: "Points reset successfully" } });
  });
});

// ===========================================================================
// tiers
// ===========================================================================

describe("the tier controller", () => {
  test("creates a tier inside the caller's own program", async () => {
    (createLoyaltyTier as Mock).mockResolvedValue({ id: "tier-1" });
    const rep = reply();

    await createLoyaltyTierHandler(request({ body: { name: "Gold", threshold: 1000 } }), rep);

    expect(createLoyaltyTier).toHaveBeenCalledWith({ name: "Gold", threshold: 1000 }, PROGRAM);
    expect(answer(rep).code).toBe(201);
  });

  test("refuses to create a tier when the org has no program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await createLoyaltyTierHandler(request({ body: {} }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Loyalty program not found" } });
  });

  test("lists the caller's tiers, or an empty array with no program", async () => {
    (getLoyaltyTiers as Mock).mockResolvedValue([{ id: "tier-1" }]);
    const rep = reply();
    await getLoyaltyTiersHandler(request(), rep);
    expect(answer(rep)).toEqual({ code: 200, body: [{ id: "tier-1" }] });

    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep2 = reply();
    await getLoyaltyTiersHandler(request(), rep2);
    expect(answer(rep2)).toEqual({ code: 200, body: [] });
  });

  test("fetches a tier by the path id alone", async () => {
    (getLoyaltyTierById as Mock).mockResolvedValue({ id: "tier-other" });

    await getLoyaltyTierByIdHandler(request({ params: { tierId: "tier-other" } }), reply());

    expect(getLoyaltyProgramByOrg).not.toHaveBeenCalled();
    expect(getLoyaltyTierById).toHaveBeenCalledWith("tier-other");
  });

  test("answers 404 for a tier that does not exist", async () => {
    (getLoyaltyTierById as Mock).mockResolvedValue(null);
    const rep = reply();

    await getLoyaltyTierByIdHandler(request({ params: { tierId: "nope" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Tier not found" } });
  });

  test("reports a priority clash as a 400", async () => {
    (updateLoyaltyTier as Mock).mockRejectedValue(
      Object.assign(new Error("dup"), { code: "P2002" }),
    );
    const rep = reply();

    await updateLoyaltyTierHandler(request({ params: { tierId: "tier-1" }, body: {} }), rep);

    expect(rep.send.mock.calls.at(-1)![0]).toEqual({
      error: "Tier with this priority name already exists",
    });
  });

  test("accepts the downgrade confirmation as a boolean or the string true", async () => {
    await deleteLoyaltyTierHandler(
      request({ params: { tierId: "tier-1" }, query: { downgradeCustomers: true } }),
      reply(),
    );
    expect((deleteLoyaltyTier as Mock).mock.calls[0][1]).toEqual({ downgradeCustomers: true });

    await deleteLoyaltyTierHandler(
      request({ params: { tierId: "tier-1" }, query: { downgradeCustomers: "true" } }),
      reply(),
    );
    expect((deleteLoyaltyTier as Mock).mock.calls[1][1]).toEqual({ downgradeCustomers: true });
  });

  test("treats any other value as no confirmation", async () => {
    await deleteLoyaltyTierHandler(
      request({ params: { tierId: "tier-1" }, query: { downgradeCustomers: "yes" } }),
      reply(),
    );

    expect((deleteLoyaltyTier as Mock).mock.calls[0][1]).toEqual({ downgradeCustomers: false });
  });

  test("turns a populated tier into a 409 that names the count", async () => {
    (deleteLoyaltyTier as Mock).mockRejectedValue(
      Object.assign(new Error("This tier has customers."), {
        code: "TIER_HAS_CUSTOMERS",
        customerCount: 7,
      }),
    );
    const rep = reply();

    await deleteLoyaltyTierHandler(request({ params: { tierId: "tier-1" }, query: {} }), rep);

    expect(answer(rep)).toEqual({
      code: 409,
      body: {
        error: "This tier has customers.",
        code: "TIER_HAS_CUSTOMERS",
        customerCount: 7,
        requiresDowngrade: true,
      },
    });
  });

  test("turns a missing downgrade target into a 400", async () => {
    (deleteLoyaltyTier as Mock).mockRejectedValue(
      Object.assign(new Error("no previous tier"), { code: "TIER_DOWNGRADE_TARGET_NOT_FOUND" }),
    );
    const rep = reply();

    await deleteLoyaltyTierHandler(request({ params: { tierId: "tier-1" }, query: {} }), rep);

    expect(answer(rep).code).toBe(400);
  });

  test("answers 204 on a successful delete", async () => {
    const rep = reply();

    await deleteLoyaltyTierHandler(request({ params: { tierId: "tier-1" }, query: {} }), rep);

    expect(answer(rep).code).toBe(204);
  });
});

// ===========================================================================
// rewards
// ===========================================================================

describe("the reward controller", () => {
  test("creates a reward inside the caller's own program", async () => {
    (createLoyaltyReward as Mock).mockResolvedValue({ id: "rwd-1" });
    const rep = reply();

    await createLoyaltyRewardHandler(request({ body: { name: "Free coffee" } }), rep);

    expect(createLoyaltyReward).toHaveBeenCalledWith({ name: "Free coffee" }, PROGRAM);
    expect(answer(rep).code).toBe(201);
  });

  test("lists all rewards by default", async () => {
    (getLoyaltyRewards as Mock).mockResolvedValue([]);

    await getLoyaltyRewardsHandler(request({ query: {} }), reply());

    expect(getLoyaltyRewards).toHaveBeenCalledWith(PROGRAM);
    expect(getActiveLoyaltyRewards).not.toHaveBeenCalled();
  });

  test("lists only active rewards when asked", async () => {
    (getActiveLoyaltyRewards as Mock).mockResolvedValue([]);

    await getLoyaltyRewardsHandler(request({ query: { active: "true" } }), reply());

    expect(getActiveLoyaltyRewards).toHaveBeenCalledWith(PROGRAM);
  });

  test("only the exact string true switches to the active list", async () => {
    (getLoyaltyRewards as Mock).mockResolvedValue([]);

    await getLoyaltyRewardsHandler(request({ query: { active: "1" } }), reply());

    expect(getLoyaltyRewards).toHaveBeenCalled();
  });

  test("fetches, updates and deletes a reward by the path id alone", async () => {
    (getLoyaltyRewardById as Mock).mockResolvedValue({ id: "rwd-other" });

    await getLoyaltyRewardByIdHandler(request({ params: { rewardId: "rwd-other" } }), reply());
    await updateLoyaltyRewardHandler(
      request({ params: { rewardId: "rwd-other" }, body: { pointsCost: 1 } }),
      reply(),
    );
    await deleteLoyaltyRewardHandler(request({ params: { rewardId: "rwd-other" } }), reply());

    expect(getLoyaltyProgramByOrg).not.toHaveBeenCalled();
    expect(getLoyaltyRewardById).toHaveBeenCalledWith("rwd-other");
    expect(updateLoyaltyReward).toHaveBeenCalledWith("rwd-other", { pointsCost: 1 });
    expect(deleteLoyaltyReward).toHaveBeenCalledWith("rwd-other");
  });

  test("answers 404 for a reward that does not exist", async () => {
    (getLoyaltyRewardById as Mock).mockResolvedValue(null);
    const rep = reply();

    await getLoyaltyRewardByIdHandler(request({ params: { rewardId: "nope" } }), rep);

    expect(answer(rep).code).toBe(404);
  });

  test("reports a refused delete as a 500 with the reason", async () => {
    (deleteLoyaltyReward as Mock).mockRejectedValue(
      new Error("Cannot delete reward with pending redemptions. Complete them first."),
    );
    const rep = reply();

    await deleteLoyaltyRewardHandler(request({ params: { rewardId: "rwd-1" } }), rep);

    expect(answer(rep).body.error).toContain("pending redemptions");
  });
});

// ===========================================================================
// earning rules
// ===========================================================================

describe("the earning rule controller", () => {
  test("creates a rule inside the caller's own program", async () => {
    (createLoyaltyEarningRule as Mock).mockResolvedValue({ id: "rule-1" });
    const rep = reply();

    await createLoyaltyEarningRuleHandler(request({ body: { name: "Base" } }), rep);

    expect(createLoyaltyEarningRule).toHaveBeenCalledWith({ name: "Base" }, PROGRAM);
    expect(answer(rep).code).toBe(201);
  });

  test("lists all rules by default and the active ones on request", async () => {
    (getLoyaltyEarningRules as Mock).mockResolvedValue([]);
    (getActiveLoyaltyEarningRules as Mock).mockResolvedValue([]);

    await getLoyaltyEarningRulesHandler(request({ query: {} }), reply());
    expect(getLoyaltyEarningRules).toHaveBeenCalledWith(PROGRAM);

    await getLoyaltyEarningRulesHandler(request({ query: { active: "true" } }), reply());
    expect(getActiveLoyaltyEarningRules).toHaveBeenCalledWith(PROGRAM);
  });

  test("answers an empty array when the org has no program", async () => {
    (getLoyaltyProgramByOrg as Mock).mockResolvedValue(null);
    const rep = reply();

    await getLoyaltyEarningRulesHandler(request({ query: {} }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: [] });
  });

  test("fetches, updates and deletes a rule by the path id alone", async () => {
    (getLoyaltyEarningRuleById as Mock).mockResolvedValue({ id: "rule-other" });

    await getLoyaltyEarningRuleByIdHandler(request({ params: { ruleId: "rule-other" } }), reply());
    await updateLoyaltyEarningRuleHandler(
      request({ params: { ruleId: "rule-other" }, body: { pointsPerUnit: 100 } }),
      reply(),
    );
    await deleteLoyaltyEarningRuleHandler(request({ params: { ruleId: "rule-other" } }), reply());

    expect(getLoyaltyProgramByOrg).not.toHaveBeenCalled();
    expect(updateLoyaltyEarningRule).toHaveBeenCalledWith("rule-other", { pointsPerUnit: 100 });
    expect(deleteLoyaltyEarningRule).toHaveBeenCalledWith("rule-other");
  });

  test("answers 404 for a rule that does not exist", async () => {
    (getLoyaltyEarningRuleById as Mock).mockResolvedValue(null);
    const rep = reply();

    await getLoyaltyEarningRuleByIdHandler(request({ params: { ruleId: "nope" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Earning rule not found" } });
  });
});

// ===========================================================================
// dashboard
// ===========================================================================

describe("the dashboard controller", () => {
  test("returns the org's stats", async () => {
    (getLoyaltyDashboardStats as Mock).mockResolvedValue({ programExists: true });
    const rep = reply();

    await getLoyaltyDashboardStatsHandler(request(), rep);

    expect(getLoyaltyDashboardStats).toHaveBeenCalledWith(ORG, {});
    expect(answer(rep)).toEqual({ code: 200, body: { programExists: true } });
  });

  test("answers a failure with an error object, like every other endpoint", async () => {
    (getLoyaltyDashboardStats as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getLoyaltyDashboardStatsHandler(request(), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "boom" } });
  });
});
