import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../utils/prisma.js", () => ({
  default: { team: { findUnique: vi.fn() } },
}));
vi.mock("../subscription/planLimits.js", () => ({ enforcePlanLimit: vi.fn(() => vi.fn()) }));

import prisma from "../../utils/prisma.js";
import { buildActor } from "../../authz/actor.js";
import { verifyTeamAccess, verifyTeamAdminAccess, verifyTeamParamInScope } from "./team.auth.js";

type Mock = ReturnType<typeof vi.fn>;
const findTeam = (prisma as unknown as { team: { findUnique: Mock } }).team.findUnique;

const admin = buildActor({ kind: "user", userId: "u-1", orgId: "org-a", roleKey: "ADMIN" });

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

beforeEach(() => {
  vi.clearAllMocks();
  findTeam.mockResolvedValue({ orgId: "org-a" });
});

describe("team guards are org-aware", () => {
  test("verifyTeamAdminAccess refuses an org-wide admin on another org's team", async () => {
    findTeam.mockResolvedValue({ orgId: "org-b" });
    const rep = reply();
    await verifyTeamAdminAccess({ params: { id: "t-b" }, actor: admin } as never, rep);
    expect(rep.code).toHaveBeenCalledWith(403);
  });

  test("verifyTeamAdminAccess admits the admin's own team", async () => {
    const rep = reply();
    await verifyTeamAdminAccess({ params: { id: "t-a" }, actor: admin } as never, rep);
    expect(rep.code).not.toHaveBeenCalled();
  });

  test("verifyTeamAccess refuses another org's team named in the path", async () => {
    findTeam.mockResolvedValue({ orgId: "org-b" });
    const rep = reply();
    await verifyTeamAccess({ params: { teamId: "t-b" }, actor: admin } as never, rep);
    expect(rep.code).toHaveBeenCalledWith(403);
  });

  test("verifyTeamParamInScope reads :teamId or :id and refuses a foreign team", async () => {
    findTeam.mockResolvedValue({ orgId: "org-b" });
    for (const params of [{ teamId: "t-b" }, { id: "t-b" }]) {
      const rep = reply();
      await verifyTeamParamInScope({ params, actor: admin } as never, rep);
      expect(rep.code).toHaveBeenCalledWith(403);
    }
  });

  test("verifyTeamParamInScope admits a team of the caller's org", async () => {
    const rep = reply();
    await verifyTeamParamInScope({ params: { teamId: "t-a" }, actor: admin } as never, rep);
    expect(rep.code).not.toHaveBeenCalled();
  });
});
