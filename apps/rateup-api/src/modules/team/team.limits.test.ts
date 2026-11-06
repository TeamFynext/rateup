import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    team: { count: vi.fn() },
    teamMember: { findMany: vi.fn() },
    invitation: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));
vi.mock("../subscription/subscription.service.js", () => ({ getSubscription: vi.fn() }));

import prisma from "../../utils/prisma.js";
import {
  getEnterpriseSubscriptionFeatures,
  UNLIMITED_COUNT,
} from "../subscription/subscription.data.js";
import { getSubscription } from "../subscription/subscription.service.js";
import { verifyTeamMaxCountRestriction, verifyTeamMemberMaxCountRestriction } from "./team.auth.js";
import { assertSeatAvailable } from "./team.limits.js";

/** Just the bits of the reply these preHandlers touch. */
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

/** A request as it reaches the gate: session org, plus the features the plan gate loaded. */
function requestFor(features: unknown, body: Record<string, unknown> = {}) {
  return {
    user: { orgId: "org-1" },
    subscription: { features },
    body: { orgId: "org-1", ...body },
  } as any;
}

const withTeams = (max: number) => ({ team: { count: { max } } });
const withSeats = (max: number) => ({ team: { teamMember: { count: { max } } } });

describe("the team-count limit", () => {
  beforeEach(() => {
    vi.mocked(prisma.team.count)
      .mockReset()
      .mockResolvedValue(3 as never);
  });

  test("refuses the team that would go past the plan's number", async () => {
    // The bug this covers: the gate was a commented-out stub, so an org capped at 3 teams
    // created a fourth and every one after it.
    const { reply, sent } = replyStub();

    await verifyTeamMaxCountRestriction(requestFor(withTeams(3)), reply as never);

    expect(sent.code).toBe(403);
    expect(sent.body.message).toBe("You have reached the maximum limit of 3 teams.");
    expect(sent.body.displayMessageInClient).toBe(true);
  });

  test("allows a team while there is room", async () => {
    const { reply, sent } = replyStub();

    await verifyTeamMaxCountRestriction(requestFor(withTeams(5)), reply as never);

    expect(sent.code).toBeUndefined();
  });

  test("does not meter an uncapped plan", async () => {
    // Enterprise's sentinel is not a ceiling anyone should be measured against.
    const { reply, sent } = replyStub();

    await verifyTeamMaxCountRestriction(requestFor(withTeams(UNLIMITED_COUNT)), reply as never);

    expect(sent.code).toBeUndefined();
    expect(prisma.team.count).not.toHaveBeenCalled();
  });

  test("meters a contracted Enterprise ceiling like any other number", async () => {
    // Enterprise capped at 3 teams by agreement: every other count is still the sentinel,
    // and only the one the contract set is enforced.
    const enterprise = getEnterpriseSubscriptionFeatures() as any;
    enterprise.team.count.max = 3;
    const { reply, sent } = replyStub();

    await verifyTeamMaxCountRestriction(requestFor(enterprise), reply as never);

    expect(sent.code).toBe(403);
    expect(sent.body.message).toBe("You have reached the maximum limit of 3 teams.");
  });

  test("enforces nothing when the plan stores no team allowance", async () => {
    const { reply, sent } = replyStub();

    await verifyTeamMaxCountRestriction(requestFor({}), reply as never);

    expect(sent.code).toBeUndefined();
  });

  test("refuses a body that names another org rather than metering the wrong one", async () => {
    // `orgId` comes from the client. Counting the session's teams while the team is
    // created elsewhere would make the limit a field anyone could edit around.
    const { reply, sent } = replyStub();

    await verifyTeamMaxCountRestriction(
      requestFor(withTeams(5), { orgId: "org-someone-else" }),
      reply as never,
    );

    expect(sent.code).toBe(403);
    expect(prisma.team.count).not.toHaveBeenCalled();
  });
});

describe("the seat limit", () => {
  function seats(userIds: string[], pendingEmails: string[] = []) {
    vi.mocked(prisma.teamMember.findMany).mockResolvedValue(
      userIds.map((userId) => ({ userId })) as never,
    );
    vi.mocked(prisma.invitation.findMany).mockResolvedValue(
      pendingEmails.map((email) => ({ email })) as never,
    );
  }

  beforeEach(() => {
    vi.mocked(prisma.teamMember.findMany).mockReset();
    vi.mocked(prisma.invitation.findMany).mockReset();
    vi.mocked(prisma.user.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
    seats([]);
  });

  test("counts outstanding invitations as seats already taken", async () => {
    // An invite is a seat held: letting ten of them through and refusing on acceptance
    // would break the news to the invitee rather than to the admin who sent it.
    seats(["u1", "u2"], ["c@example.com"]);
    const { reply, sent } = replyStub();

    await verifyTeamMemberMaxCountRestriction(requestFor(withSeats(3)), reply as never);

    expect(sent.code).toBe(403);
    expect(sent.body.message).toBe("You have reached the maximum limit of 3 users.");
  });

  test("counts one person on two teams once", async () => {
    // The distinct query is what does this; TeamMember rows would read as two seats.
    seats(["u1", "u2"]);
    const { reply, sent } = replyStub();

    await verifyTeamMemberMaxCountRestriction(requestFor(withSeats(3)), reply as never);

    expect(sent.code).toBeUndefined();
    expect(vi.mocked(prisma.teamMember.findMany).mock.calls[0][0]).toMatchObject({
      distinct: ["userId"],
      where: { team: { orgId: "org-1" } },
    });
  });

  test("does not double-count an invite sent to someone already on a team", async () => {
    seats(["u1", "u2"], ["u2@example.com"]);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u2", email: "u2@example.com" },
    ] as never);
    const { reply, sent } = replyStub();

    await verifyTeamMemberMaxCountRestriction(requestFor(withSeats(3)), reply as never);

    expect(sent.code).toBeUndefined();
  });

  test("does not meter an uncapped plan", async () => {
    const { reply, sent } = replyStub();

    await verifyTeamMemberMaxCountRestriction(
      requestFor(withSeats(UNLIMITED_COUNT)),
      reply as never,
    );

    expect(sent.code).toBeUndefined();
    expect(prisma.teamMember.findMany).not.toHaveBeenCalled();
  });
});

describe("the seat limit off the route", () => {
  beforeEach(() => {
    vi.mocked(prisma.teamMember.findMany)
      .mockReset()
      .mockResolvedValue([{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }] as never);
    vi.mocked(prisma.invitation.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
    vi.mocked(prisma.user.findMany)
      .mockReset()
      .mockResolvedValue([] as never);
    vi.mocked(getSubscription).mockReset();
  });

  test("refuses an invite made through the service, which Zapier calls directly", async () => {
    // No preHandler runs on that path, so a limit living only on the route would be one
    // integration away from not existing.
    vi.mocked(getSubscription).mockResolvedValue({ features: withSeats(3) } as never);

    await expect(assertSeatAvailable("org-1")).rejects.toThrow(
      "You have reached the maximum limit of 3 users.",
    );
  });

  test("allows the invite while there is room", async () => {
    vi.mocked(getSubscription).mockResolvedValue({ features: withSeats(5) } as never);

    await expect(assertSeatAvailable("org-1")).resolves.toBeUndefined();
  });

  test("does not meter an uncapped plan", async () => {
    vi.mocked(getSubscription).mockResolvedValue({
      features: withSeats(UNLIMITED_COUNT),
    } as never);

    await expect(assertSeatAvailable("org-1")).resolves.toBeUndefined();
    expect(prisma.teamMember.findMany).not.toHaveBeenCalled();
  });
});
