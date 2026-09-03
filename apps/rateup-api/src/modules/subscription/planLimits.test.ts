import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    team: { count: vi.fn() },
    teamMember: { findMany: vi.fn() },
    invitation: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    usageStats: { findUnique: vi.fn() },
  },
}));
vi.mock("./conversationBudget.js", () => ({ getConversationBudget: vi.fn() }));
vi.mock("./subscription.service.js", () => ({ getSubscription: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { getConversationBudget } from "./conversationBudget.js";
import { getSubscription } from "./subscription.service.js";
import { UNLIMITED_COUNT } from "./subscription.data.js";
import {
  assertPlanLimit,
  checkPlanLimit,
  enforcePlanLimit,
  PLAN_LIMITS,
  PlanLimitError,
  planLimitMessage,
} from "./planLimits.js";

function replyStub() {
  const sent: { code?: number; body?: any } = {};
  const reply = {
    code(code: number) {
      sent.code = code;
      return reply;
    },
    send(body: unknown) {
      sent.body = body;
      return reply;
    },
  };
  return { reply, sent };
}

const withTeams = (max: number) => ({ team: { count: { max } } });

describe("checking one limit", () => {
  beforeEach(() => {
    vi.mocked(prisma.team.count)
      .mockReset()
      .mockResolvedValue(3 as never);
    vi.mocked(getSubscription).mockReset();
  });

  test("reports where the org stands", async () => {
    expect(await checkPlanLimit("org-1", "teams", withTeams(5))).toEqual({
      metered: true,
      max: 5,
      used: 3,
      remaining: 2,
      exceeded: false,
    });
  });

  test("is exceeded at the ceiling, not past it — one more would be the fourth of three", async () => {
    expect(await checkPlanLimit("org-1", "teams", withTeams(3))).toMatchObject({
      exceeded: true,
      remaining: 0,
    });
  });

  test("treats absent, zero and the unlimited sentinel alike: not metered", async () => {
    // The three ways a plan says "no ceiling here". Every gate used to decide this for
    // itself, and they did not all agree — a stored zero blocked everything on some paths
    // and meant unlimited on others.
    for (const features of [{}, withTeams(0), withTeams(UNLIMITED_COUNT)]) {
      expect(await checkPlanLimit("org-1", "teams", features)).toMatchObject({
        metered: false,
        exceeded: false,
      });
    }
    // Not metered means not counted, either.
    expect(prisma.team.count).not.toHaveBeenCalled();
  });

  test("meters a contracted ceiling that sits under the sentinel", async () => {
    // An Enterprise org capped by agreement: the tier says unlimited, the subscription
    // says 3, and the number that binds is the one on the subscription.
    expect(await checkPlanLimit("org-1", "teams", withTeams(3))).toMatchObject({
      metered: true,
      exceeded: true,
    });
  });

  test("loads the org's own features when the caller has none to hand", async () => {
    vi.mocked(getSubscription).mockResolvedValue({ features: withTeams(3) } as never);

    expect(await checkPlanLimit("org-1", "teams")).toMatchObject({ exceeded: true });
    expect(getSubscription).toHaveBeenCalledWith("org-1");
  });

  test("enforces nothing for an org with no subscription at all", async () => {
    vi.mocked(getSubscription).mockResolvedValue(null as never);

    expect(await checkPlanLimit("org-1", "teams")).toMatchObject({ metered: false });
  });

  test("takes the ceiling from the override where one exists", async () => {
    // Conversations are the only limit whose stored number is not the whole answer: packs
    // raise it and an annual plan pools twelve months of it.
    vi.mocked(getConversationBudget).mockResolvedValue({
      metered: true,
      max: 6_000,
      used: 6_000,
      remaining: 0,
      isAnnual: false,
    });

    expect(await checkPlanLimit("org-1", "conversations")).toMatchObject({
      max: 6_000,
      used: 6_000,
      exceeded: true,
    });
    // The override reads what it needs itself; no second subscription query.
    expect(getSubscription).not.toHaveBeenCalled();
  });
});

describe("the refusal", () => {
  test("pluralises against the count it names", () => {
    expect(planLimitMessage("teams", 3)).toBe("You have reached the maximum limit of 3 teams.");
    expect(planLimitMessage("teams", 1)).toBe("You have reached the maximum limit of 1 team.");
    expect(planLimitMessage("users", 10)).toBe("You have reached the maximum limit of 10 users.");
  });
});

describe("the route gate", () => {
  const request = (features: unknown, body: Record<string, unknown> = {}) =>
    ({ user: { orgId: "org-1" }, subscription: { features }, body }) as any;

  beforeEach(() => {
    vi.mocked(prisma.team.count)
      .mockReset()
      .mockResolvedValue(3 as never);
  });

  test("refuses at the limit and says so in the client's own words", async () => {
    const { reply, sent } = replyStub();

    await enforcePlanLimit("teams")(request(withTeams(3)), reply as never);

    expect(sent.code).toBe(403);
    expect(sent.body).toEqual({
      message: "You have reached the maximum limit of 3 teams.",
      displayMessageInClient: true,
    });
  });

  test("passes the request through while there is room", async () => {
    const { reply, sent } = replyStub();

    await enforcePlanLimit("teams")(request(withTeams(5)), reply as never);

    expect(sent.code).toBeUndefined();
  });

  test("refuses when the chain left no subscription on the request", async () => {
    // Every route carrying a limit registers the subscription handler first, so this means
    // the chain is wired wrong — not that the org has no limits.
    const { reply, sent } = replyStub();

    await enforcePlanLimit("teams")({ user: { orgId: "org-1" } } as any, reply as never);

    expect(sent.code).toBe(403);
    expect(sent.body.message).toBe("Subscription not found");
  });

  test("refuses a body that names another org rather than metering the wrong one", async () => {
    // `orgId` comes from the client, so counting the session's teams while the team is
    // created elsewhere would make the limit a field anyone could edit around.
    const { reply, sent } = replyStub();
    const gate = enforcePlanLimit("teams", {
      org: (req: any) => (req.body?.orgId === req.user.orgId ? req.user.orgId : null),
      orgMismatchMessage: "You cannot create a team in another organisation",
    });

    await gate(request(withTeams(5), { orgId: "org-someone-else" }), reply as never);

    expect(sent.code).toBe(403);
    expect(sent.body.message).toBe("You cannot create a team in another organisation");
    expect(prisma.team.count).not.toHaveBeenCalled();
  });
});

describe("the service backstop", () => {
  beforeEach(() => {
    vi.mocked(prisma.team.count)
      .mockReset()
      .mockResolvedValue(3 as never);
  });

  test("throws a 403-shaped error naming the limit that was hit", async () => {
    await expect(assertPlanLimit("org-1", "teams", withTeams(3))).rejects.toThrow(
      new PlanLimitError("teams", "You have reached the maximum limit of 3 teams."),
    );
  });

  test("resolves while there is room", async () => {
    await expect(assertPlanLimit("org-1", "teams", withTeams(5))).resolves.toBeUndefined();
  });
});

describe("the registry itself", () => {
  test("every limit names a path and a noun", () => {
    for (const [name, limit] of Object.entries(PLAN_LIMITS)) {
      expect(limit.path, `${name} needs a features path`).toMatch(/\w+(\.\w+)+/);
      expect(limit.noun.one, `${name} needs a singular noun`).toBeTruthy();
      expect(limit.noun.many, `${name} needs a plural noun`).toBeTruthy();
    }
  });

  test("holds these four and nothing else", () => {
    // The registry is the list of what the plans actually sell. Five more limits used to
    // live here reading a `whatsapp.count.max` no tier defines — they metered nothing, so
    // they were deleted rather than left looking enforced. Adding a row means adding a
    // number to the pricing page too.
    expect(Object.keys(PLAN_LIMITS)).toEqual(["teams", "users", "conversations", "formResponses"]);
  });
});
