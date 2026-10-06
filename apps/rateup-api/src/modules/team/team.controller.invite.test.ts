import { beforeEach, describe, expect, test, vi } from "vitest";
import { legacyRoleToKey, ROLE_PERMISSIONS, type LegacyRole } from "../../authz/roles.js";

vi.mock("./team.service.js", () => ({
  addMemberToTeams: vi.fn(),
  addMembersToTeamsMail: vi.fn(),
  completeInvite: vi.fn(),
  createTeam: vi.fn(),
  deleteMemberInvite: vi.fn(),
  deleteTeamById: vi.fn(),
  deleteTeamMember: vi.fn(),
  editTeam: vi.fn(),
  getTeamById: vi.fn(),
  getTeamChannels: vi.fn(),
  getTeamFeatures: vi.fn(),
  getTeamMembers: vi.fn(),
  getTeamMembersAndFromInvitation: vi.fn(),
  getTeamsByOrgId: vi.fn(),
  getTeamsByUserId: vi.fn(),
  getUsersNotInTeam: vi.fn(),
  inviteTeamMember: vi.fn(),
  manageTags: vi.fn(),
  resendInviteTeamMember: vi.fn(),
  setTeamChannels: vi.fn(),
  setTeamFeatures: vi.fn(),
}));

vi.mock("supertokens-node/recipe/session/index.js", () => ({
  default: { getSession: vi.fn() },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../integrations/events/emitIntegrationEvent.js", () => ({
  emitIntegrationEvent: vi.fn(),
}));

import {
  addMemberToTeams,
  addMembersToTeamsMail,
  completeInvite,
  getTeamById,
  inviteTeamMember,
} from "./team.service.js";
import { log } from "../../utils/logger.js";
import { emitIntegrationEvent } from "../integrations/events/emitIntegrationEvent.js";
import {
  addMembertoTeamsHandler,
  completeInviteHandler,
  inviteMemberHandler,
} from "./team.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const completeInviteMock = completeInvite as unknown as Mock;
const emitMock = emitIntegrationEvent as unknown as Mock;

const ACCEPTED_INVITE = {
  id: "invite-token-1",
  email: "invitee@acme.com",
  name: "Invitee",
  orgId: "org-1",
  team: { code: "T1", name: "Support" },
  isUser: false,
  redirectLink: "https://app.rateup.app/auth/reset-password?token=reset-1",
};

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    send: vi.fn((p?: unknown) => {
      reply.payload = p;
      return reply;
    }),
  };
  return reply;
}

function makeRequest(token = "invite-token-1") {
  return { params: { token } } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  completeInviteMock.mockResolvedValue(ACCEPTED_INVITE);
});

describe("completeInviteHandler", () => {
  test("accepts the invitation named by the token in the path", async () => {
    await completeInviteHandler(makeRequest(), makeReply());

    expect(completeInviteMock).toHaveBeenCalledWith("invite-token-1");
  });

  test("returns the accepted invitation, including where to send the invitee next", async () => {
    const reply = makeReply();

    await completeInviteHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({
      message: "Invite Accepted successfully.",
      data: ACCEPTED_INVITE,
    });
  });

  test("tells the integrations (Zapier) that a team member joined the org", async () => {
    await completeInviteHandler(makeRequest(), makeReply());

    expect(emitMock).toHaveBeenCalledWith("org-1", {
      type: "team.member_joined",
      member: {
        name: "Invitee",
        email: "invitee@acme.com",
        isExistingUser: false,
        team: { code: "T1", name: "Support" },
      },
    });
  });

  test("returns 500 and logs when the invitation cannot be accepted", async () => {
    completeInviteMock.mockRejectedValue(new Error("Invitation not found"));
    const reply = makeReply();

    await completeInviteHandler(makeRequest("bad-token"), reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({
      message: "Internal server error : Error: Invitation not found",
    });
    expect(log.error).toHaveBeenCalled();
  });

  test("announces nothing when acceptance failed", async () => {
    completeInviteMock.mockRejectedValue(new Error("Invitation not found"));

    await completeInviteHandler(makeRequest("bad-token"), makeReply());

    expect(emitMock).not.toHaveBeenCalled();
  });

  // The trigger is queued before the reply is sent, so a queue failure produces one
  // 500 rather than a 500 contradicting an already-sent 200.
  test("answers a single 500 when the announcement throws", async () => {
    emitMock.mockRejectedValue(new Error("queue down"));
    const reply = makeReply();

    await completeInviteHandler(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledTimes(1);
    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

describe("addMembertoTeamsHandler", () => {
  // checkSession puts the caller's id on `user.userId`; an earlier `user.id` check
  // here turned every authenticated call into a 401 "Missing user".
  function memberRequest(user: Record<string, unknown>) {
    return {
      params: { id: "user-2" },
      body: { teamIds: ["team-1"], userEmail: "invitee@acme.com" },
      user,
    } as any;
  }

  beforeEach(() => {
    (addMemberToTeams as unknown as Mock).mockResolvedValue({ count: 1 });
    (getTeamById as unknown as Mock).mockResolvedValue({ name: "Support" });
    (addMembersToTeamsMail as unknown as Mock).mockResolvedValue(undefined);
  });

  test("adds the member for a session-authenticated caller", async () => {
    const reply = makeReply();

    await addMembertoTeamsHandler(memberRequest({ userId: "user-1", orgId: "org-1" }), reply);

    expect(addMemberToTeams).toHaveBeenCalledWith(["team-1"], "user-2", "org-1");
    expect(addMembersToTeamsMail).toHaveBeenCalledWith("invitee@acme.com", "Support", {
      id: "user-1",
      orgId: "org-1",
    });
    expect(reply.payload).toEqual({ count: 1 });
  });

  test("rejects a caller with no user id", async () => {
    const reply = makeReply();

    await addMembertoTeamsHandler(memberRequest({ orgId: "org-1" }), reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.payload).toEqual({ message: "Missing user" });
    expect(addMemberToTeams).not.toHaveBeenCalled();
  });
});

describe("inviteMemberHandler", () => {
  function inviteRequest(callerRole: string, invitedRole?: string) {
    return {
      body: {
        name: "Invitee",
        email: "invitee@acme.com",
        orgId: "org-1",
        teamId: "team-1",
        invitedBy: "user-1",
        type: "TEAM",
        role: invitedRole,
      },
      user: { userId: "user-1", orgId: "org-1", role: callerRole },
      actor: { permissions: ROLE_PERMISSIONS[legacyRoleToKey(callerRole as LegacyRole, false)] },
    } as any;
  }

  beforeEach(() => {
    (inviteTeamMember as unknown as Mock).mockResolvedValue({ id: "invite-1" });
  });

  test("lets an admin invite a staff member", async () => {
    const reply = makeReply();

    await inviteMemberHandler(inviteRequest("ADMIN", "MEMBER"), reply);

    expect(inviteTeamMember).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(201);
  });

  test("refuses an admin trying to invite a super admin", async () => {
    const reply = makeReply();

    await inviteMemberHandler(inviteRequest("ADMIN", "SUPER_ADMIN"), reply);

    expect(inviteTeamMember).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  test("lets a super admin invite another super admin", async () => {
    const reply = makeReply();

    await inviteMemberHandler(inviteRequest("SUPER_ADMIN", "SUPER_ADMIN"), reply);

    expect(inviteTeamMember).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(201);
  });
});
