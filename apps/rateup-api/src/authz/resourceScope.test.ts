import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../utils/prisma.js", () => ({
  default: {
    pipeline: { findFirst: vi.fn() },
    pipelineTeam: { findFirst: vi.fn() },
    survey: { findFirst: vi.fn() },
    surveyTeamMap: { findFirst: vi.fn() },
  },
}));

import prisma from "../utils/prisma.js";
import type { Actor } from "./actor.js";
import { pipelineInScope, surveyInScope } from "./resourceScope.js";

// oxlint-disable-next-line typescript/no-explicit-any
const db = prisma as any;

const ORG = "org-own";
const orgWide = { orgId: ORG, scope: { all: true, teamIds: [] } } as unknown as Actor;
const teamScoped = { orgId: ORG, scope: { all: false, teamIds: ["team-1"] } } as unknown as Actor;

beforeEach(() => vi.clearAllMocks());

describe("pipelineInScope", () => {
  test("an org-wide actor reaches only its own org's boards", async () => {
    db.pipeline.findFirst.mockResolvedValue(null);

    expect(await pipelineInScope("someone-elses-board", orgWide)).toBe(false);
    expect(db.pipeline.findFirst.mock.calls[0][0].where).toEqual({
      id: "someone-elses-board",
      orgId: ORG,
    });
  });

  test("an org-wide actor reaches a board in its org", async () => {
    db.pipeline.findFirst.mockResolvedValue({ id: "board" });

    expect(await pipelineInScope("board", orgWide)).toBe(true);
  });

  test("a team-scoped actor is matched on its teams and its org", async () => {
    db.pipelineTeam.findFirst.mockResolvedValue({ pipelineId: "board" });

    expect(await pipelineInScope("board", teamScoped)).toBe(true);
    expect(db.pipelineTeam.findFirst.mock.calls[0][0].where).toEqual({
      pipelineId: "board",
      pipeline: { orgId: ORG },
      teamId: { in: ["team-1"] },
    });
  });
});

describe("surveyInScope", () => {
  test("an org-wide actor reaches only its own org's surveys", async () => {
    db.survey.findFirst.mockResolvedValue(null);

    expect(await surveyInScope("someone-elses-survey", orgWide)).toBe(false);
    expect(db.survey.findFirst.mock.calls[0][0].where).toEqual({
      id: "someone-elses-survey",
      OR: [{ orgId: ORG }, { orgId: null }],
    });
  });
});
