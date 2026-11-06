import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    contact: { findFirst: vi.fn() },
    team: { findFirst: vi.fn() },
    teamMember: { findMany: vi.fn() },
    orgMember: { findMany: vi.fn() },
    conversationAssignedUserTeamMap: { findFirst: vi.fn() },
    waInboxAssign: { findFirst: vi.fn() },
  },
}));
vi.mock("../../whatsappSurvey/wasurvey.utils.js", () => ({ assignChat: vi.fn() }));
vi.mock("./wamessage.service.js", () => ({ assignWaMessageToUser: vi.fn() }));
vi.mock("../../../user/user.schema.js", () => ({
  UserAvailabilityStatus: { online: "online", busy: "busy", offline: "offline" },
}));

import prisma from "../../../../utils/prisma.js";
import { assignChat } from "../../whatsappSurvey/wasurvey.utils.js";
import { assignConversationOwner } from "./assignOwner.service.js";
import { assignWaMessageToUser } from "./wamessage.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;
const assignMock = assignWaMessageToUser as unknown as Mock;
const roundRobinMock = assignChat as unknown as Mock;

function actor(scope: { all: boolean; teamIds?: string[] } = { all: true }) {
  return {
    orgId: "org-1",
    userId: "me",
    scope: { all: scope.all, teamIds: scope.teamIds ?? [] },
  } as any;
}

const BASE = { contactId: "contact-1", conversationId: "conv-1" };

function assigneesSent() {
  return assignMock.mock.calls[0][0].assignees;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.contact.findFirst.mockResolvedValue({ id: "contact-1" });
  db.team.findFirst.mockResolvedValue({ id: "team-a" });
  db.teamMember.findMany.mockResolvedValue([{ teamId: "team-a" }, { teamId: "team-b" }]);
  db.conversationAssignedUserTeamMap.findFirst.mockResolvedValue(null);
  db.waInboxAssign.findFirst.mockResolvedValue(null);
  assignMock.mockResolvedValue({ assignees: [] });
});

describe("assignConversationOwner - a named person", () => {
  test("keeps the ticket's current team when the person is in it", async () => {
    db.conversationAssignedUserTeamMap.findFirst.mockResolvedValue({ teamId: "team-b" });

    await assignConversationOwner({ ...BASE, userId: "u1" }, actor());

    expect(assigneesSent()).toEqual([{ userId: "u1", teamId: "team-b" }]);
  });

  test("uses the requested team when the person belongs to it", async () => {
    db.conversationAssignedUserTeamMap.findFirst.mockResolvedValue({ teamId: "team-a" });

    await assignConversationOwner({ ...BASE, userId: "u1", teamId: "team-b" }, actor());

    expect(assigneesSent()).toEqual([{ userId: "u1", teamId: "team-b" }]);
  });

  test("falls back to the person's first team when the ticket's is not theirs", async () => {
    db.conversationAssignedUserTeamMap.findFirst.mockResolvedValue({ teamId: "team-z" });

    await assignConversationOwner({ ...BASE, userId: "u1" }, actor());

    expect(assigneesSent()).toEqual([{ userId: "u1", teamId: "team-a" }]);
  });

  test("falls back to a team the scoped actor can use, not just the first", async () => {
    // The person is in team-a (listed first) and team-b; the manager reaches only team-b.
    await assignConversationOwner(
      { ...BASE, userId: "u1" },
      actor({ all: false, teamIds: ["team-b"] }),
    );

    expect(assigneesSent()).toEqual([{ userId: "u1", teamId: "team-b" }]);
  });

  test("replaces whoever was on the ticket with exactly one owner", async () => {
    await assignConversationOwner({ ...BASE, userId: "u1" }, actor());

    expect(assigneesSent()).toHaveLength(1);
    expect(assignMock).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: "contact-1", conversationId: "conv-1" }),
      "org-1",
      "me",
    );
  });

  test("refuses a person who is in no team", async () => {
    db.teamMember.findMany.mockResolvedValue([]);

    await expect(assignConversationOwner({ ...BASE, userId: "u1" }, actor())).rejects.toMatchObject(
      { statusCode: 400 },
    );
    expect(assignMock).not.toHaveBeenCalled();
  });

  test("refuses a team outside a team-scoped actor's access", async () => {
    db.teamMember.findMany.mockResolvedValue([{ teamId: "team-x" }]);

    await expect(
      assignConversationOwner(
        { ...BASE, userId: "u1" },
        actor({ all: false, teamIds: ["team-a"] }),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("assignConversationOwner - a team", () => {
  test("hands the ticket to one available member, turn by turn", async () => {
    db.orgMember.findMany.mockResolvedValue([
      { userId: "u1", status: "offline" },
      { userId: "u2", status: "online" },
      { userId: "u3", status: "busy" },
    ]);
    roundRobinMock.mockResolvedValue("u3");

    await assignConversationOwner({ ...BASE, teamId: "team-a" }, actor());

    expect(roundRobinMock).toHaveBeenCalledWith("team-a", ["u2", "u3"], "manual-assign");
    expect(assigneesSent()).toEqual([{ userId: "u3", teamId: "team-a" }]);
  });

  test("uses everyone when nobody is available", async () => {
    db.orgMember.findMany.mockResolvedValue([{ userId: "u1", status: "offline" }]);
    roundRobinMock.mockResolvedValue("u1");

    await assignConversationOwner({ ...BASE, teamId: "team-a" }, actor());

    expect(roundRobinMock).toHaveBeenCalledWith("team-a", ["u1"], "manual-assign");
  });

  test("refuses an empty team", async () => {
    db.orgMember.findMany.mockResolvedValue([]);

    await expect(
      assignConversationOwner({ ...BASE, teamId: "team-a" }, actor()),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test("refuses a team from another org", async () => {
    db.team.findFirst.mockResolvedValue(null);

    await expect(
      assignConversationOwner({ ...BASE, teamId: "team-a" }, actor()),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("assignConversationOwner - nobody", () => {
  test("unassigns the ticket", async () => {
    await assignConversationOwner({ ...BASE }, actor());

    expect(assigneesSent()).toEqual([]);
  });

  test("refuses a contact from another org", async () => {
    db.contact.findFirst.mockResolvedValue(null);

    await expect(assignConversationOwner({ ...BASE }, actor())).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
