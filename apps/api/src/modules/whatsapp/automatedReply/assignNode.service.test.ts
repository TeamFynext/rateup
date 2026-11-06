import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../team/team.service.js", () => ({ getTeamIdsByUserId: vi.fn() }));
vi.mock("../../user/user.service.js", () => ({ getUserIdsByTeamId: vi.fn() }));
vi.mock("../inbox/message/wamessage.service.js", () => ({
  assignWaMessageToUser: vi.fn(),
  getAssignedUsersCountForContactByTeam: vi.fn(),
}));
vi.mock("../whatsappSurvey/wasurvey.utils.js", () => ({ assignChat: vi.fn() }));

import { getTeamIdsByUserId } from "../../team/team.service.js";
import { assignWaMessageToUser } from "../inbox/message/wamessage.service.js";
import type { AssignNodeData } from "../whatsappSurvey/node-types.js";
import { runAssignNode } from "./assignNode.service.js";

type Mock = ReturnType<typeof vi.fn>;

const assignToMe = {
  assign: { assignType: "me", assignedUserIds: ["user-1"] },
} as unknown as AssignNodeData;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runAssignNode — assign to me", () => {
  test("files the contact under the user's team in the flow's org", async () => {
    (getTeamIdsByUserId as Mock).mockResolvedValue(["team-a"]);

    await expect(runAssignNode(assignToMe, "contact-1", "org-A", "auto-1")).resolves.toBe(
      "assigned",
    );

    // A user in two orgs must not be assigned under the other org's team (SURV-17).
    expect(getTeamIdsByUserId).toHaveBeenCalledWith("user-1", "org-A");
    expect(assignWaMessageToUser).toHaveBeenCalledWith(
      expect.objectContaining({ assignees: [{ userId: "user-1", teamId: "team-a" }] }),
      "org-A",
    );
  });

  test("skips when the user has no team in this org", async () => {
    (getTeamIdsByUserId as Mock).mockResolvedValue([]);

    await expect(runAssignNode(assignToMe, "contact-1", "org-A", "auto-1")).resolves.toBe(
      "skipped",
    );
    expect(assignWaMessageToUser).not.toHaveBeenCalled();
  });
});
