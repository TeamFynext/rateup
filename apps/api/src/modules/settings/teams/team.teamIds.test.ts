import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    teamMember: { findMany: vi.fn() },
  },
  excludeFields: vi.fn(),
}));
vi.mock("../user/user.service.js", () => ({
  createUser: vi.fn(),
  getUserRecipeName: vi.fn(),
}));
vi.mock("supertokens-node/recipe/emailpassword/index.js", () => ({
  default: { signUp: vi.fn(), createResetPasswordLink: vi.fn() },
}));
vi.mock("supertokens-node/recipe/emailverification/index.js", () => ({
  default: { createEmailVerificationToken: vi.fn(), verifyEmailUsingToken: vi.fn() },
}));
vi.mock("../../../utils/hubspot.js", () => ({
  createHubSpotContact: vi.fn(),
  getHubSpotCompanyByOwnerEmail: vi.fn(),
}));
vi.mock("../../meta/whatsapp/settings/channelAccess.js", () => ({
  invalidateChannelAccessCache: vi.fn(),
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  notificationQueue: { add: vi.fn() },
  sendTransactionalEmail: vi.fn(),
}));
vi.mock("../../../utils/email/supertoken/inviteEmail.js", () => ({ createEmailBody: vi.fn() }));
vi.mock("../../platform/email/email.util.js", () => ({ getEmailBodyTemplate: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { getTeamIdsByUserId } from "./team.service.js";

const findMany = (prisma as unknown as { teamMember: { findMany: ReturnType<typeof vi.fn> } })
  .teamMember.findMany;

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([{ teamId: "team-a1" }, { teamId: "team-a2" }]);
});

describe("getTeamIdsByUserId", () => {
  test("limits the memberships to the given org (SURV-17)", async () => {
    await expect(getTeamIdsByUserId("user-1", "org-A")).resolves.toEqual(["team-a1", "team-a2"]);

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", team: { orgId: "org-A" } },
      select: { teamId: true },
    });
  });

  test("an empty org id matches nothing rather than every org", async () => {
    await getTeamIdsByUserId("user-1", "");

    expect(findMany.mock.calls[0][0].where).toEqual({ userId: "user-1", team: { orgId: "" } });
  });

  test("keeps the org-less lookup for the legacy caller", async () => {
    await getTeamIdsByUserId("user-1");

    expect(findMany.mock.calls[0][0].where).toEqual({ userId: "user-1" });
  });

  test("a missing user has no teams, instead of matching every membership", async () => {
    await expect(getTeamIdsByUserId(undefined as unknown as string, "org-A")).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
