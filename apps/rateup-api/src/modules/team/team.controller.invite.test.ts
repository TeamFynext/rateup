import { beforeEach, describe, expect, test, vi } from "vitest";

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
vi.mock("../integrations/external/zapier/zapier.service.js", () => ({
  addZapierTriggerToQueue: vi.fn(),
  ZapierTriggers: { NEW_TEAM_MEMBER_CREATED: "NEW_TEAM_MEMBER_CREATED" },
}));

import {
  addMemberToTeams,
  addMembersToTeamsMail,
  completeInvite,
  getTeamById,
} from "./team.service.js";
import { log } from "../../utils/logger.js";
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../integrations/external/zapier/zapier.service.js";
import { addMembertoTeamsHandler, completeInviteHandler } from "./team.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const completeInviteMock = completeInvite as unknown as Mock;
const addZapierTriggerMock = addZapierTriggerToQueue as unknown as Mock;

const ACCEPTED_INVITE = {
  id: "invite-token-1",
  email: "invitee@acme.com",
  orgId: "org-1",
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

  test("notifies Zapier that a team member joined the org", async () => {
    await completeInviteHandler(makeRequest(), makeReply());

    expect(addZapierTriggerMock).toHaveBeenCalledWith(
      ZapierTriggers.NEW_TEAM_MEMBER_CREATED,
      { [ZapierTriggers.NEW_TEAM_MEMBER_CREATED]: ACCEPTED_INVITE },
      "org-1",
    );
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

  test("does not fire the Zapier trigger when acceptance failed", async () => {
    completeInviteMock.mockRejectedValue(new Error("Invitation not found"));

    await completeInviteHandler(makeRequest("bad-token"), makeReply());

    expect(addZapierTriggerMock).not.toHaveBeenCalled();
  });

  // The trigger is queued before the reply is sent, so a queue failure produces one
  // 500 rather than a 500 contradicting an already-sent 200.
  test("answers a single 500 when the Zapier trigger throws", async () => {
    addZapierTriggerMock.mockRejectedValue(new Error("queue down"));
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

    expect(addMemberToTeams).toHaveBeenCalledWith(["team-1"], "user-2");
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
