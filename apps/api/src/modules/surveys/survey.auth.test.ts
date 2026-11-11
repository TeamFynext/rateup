import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../utils/prisma.js", () => ({ default: { team: { count: vi.fn() } } }));
vi.mock("../../authz/resourceScope.js", () => ({ surveyInScope: vi.fn() }));
vi.mock("./survey.service.js", () => ({ getSurveyIdOfVariable: vi.fn() }));
vi.mock("./survey.limits.js", () => ({
  alertResponseLimitReached: vi.fn(),
  checkResponseAllowance: vi.fn(),
  FORM_CLOSED_REASON: "form_closed",
  orgForSurveyLink: vi.fn(),
  RESPONSE_LIMIT_MESSAGE: "closed",
}));

import prisma from "../../utils/prisma.js";
import { surveyInScope } from "../../authz/resourceScope.js";
import { getSurveyIdOfVariable } from "./survey.service.js";
import { verifySurveyTeamIds, verifySurveyVariableAccess } from "./survey.auth.js";

type Mock = ReturnType<typeof vi.fn>;
const teamCount = (prisma as any).team.count as Mock;

const ORG_WIDE = { orgId: "org-1", scope: { all: true, teamIds: [] } } as any;
const TEAM_SCOPED = { orgId: "org-1", scope: { all: false, teamIds: ["t1"] } } as any;

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("verifySurveyTeamIds (SURV-7)", () => {
  test("passes when every team is the caller's org's", async () => {
    teamCount.mockResolvedValue(2);
    const rep = reply();

    await verifySurveyTeamIds(
      { actor: ORG_WIDE, body: { teamIds: ["t1", "t2", "t1"] } } as any,
      rep,
    );

    expect(rep.code).not.toHaveBeenCalled();
    expect(teamCount).toHaveBeenCalledWith({ where: { id: { in: ["t1", "t2"] }, orgId: "org-1" } });
  });

  test("refuses a team of another org, on create/clone (teamIds) and update (teams)", async () => {
    teamCount.mockResolvedValue(1);

    for (const body of [{ teamIds: ["t1", "victim"] }, { teams: ["t1", "victim"] }]) {
      const rep = reply();
      await verifySurveyTeamIds({ actor: ORG_WIDE, body } as any, rep);
      expect(rep.code).toHaveBeenCalledWith(403);
    }
  });

  test("refuses a team outside a team-scoped actor's teams without a lookup", async () => {
    const rep = reply();

    await verifySurveyTeamIds({ actor: TEAM_SCOPED, body: { teamIds: ["t2"] } } as any, rep);

    expect(rep.code).toHaveBeenCalledWith(403);
    expect(teamCount).not.toHaveBeenCalled();
  });

  test("a body naming no teams passes", async () => {
    const rep = reply();
    await verifySurveyTeamIds({ actor: ORG_WIDE, body: { title: "x" } } as any, rep);
    expect(rep.code).not.toHaveBeenCalled();
  });
});

describe("verifySurveyVariableAccess (SURV-8)", () => {
  test("checks the survey the variable belongs to", async () => {
    (getSurveyIdOfVariable as unknown as Mock).mockResolvedValue("survey-1");
    (surveyInScope as unknown as Mock).mockResolvedValue(true);
    const rep = reply();

    await verifySurveyVariableAccess({ actor: ORG_WIDE, params: { id: "var-1" } } as any, rep);

    expect(surveyInScope).toHaveBeenCalledWith("survey-1", ORG_WIDE);
    expect(rep.code).not.toHaveBeenCalled();
  });

  test("refuses a variable of a survey outside the caller's scope", async () => {
    (getSurveyIdOfVariable as unknown as Mock).mockResolvedValue("victim-survey");
    (surveyInScope as unknown as Mock).mockResolvedValue(false);
    const rep = reply();

    await verifySurveyVariableAccess({ actor: ORG_WIDE, params: { id: "var-1" } } as any, rep);

    expect(rep.code).toHaveBeenCalledWith(403);
  });

  test("refuses an unknown variable", async () => {
    (getSurveyIdOfVariable as unknown as Mock).mockResolvedValue(null);
    const rep = reply();

    await verifySurveyVariableAccess({ actor: ORG_WIDE, params: { id: "nope" } } as any, rep);

    expect(rep.code).toHaveBeenCalledWith(403);
    expect(surveyInScope).not.toHaveBeenCalled();
  });
});
