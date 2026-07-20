import dayjs from "dayjs";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    survey: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    surveyTeamMap: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
    },
    surveyStats: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
    surveyVariables: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    surveyLanding: { findUnique: vi.fn(), findMany: vi.fn() },
    webSurveyTheme: { findFirst: vi.fn() },
    usageStats: { update: vi.fn() },
    team: { findUnique: vi.fn(), update: vi.fn() },
    $queryRaw: vi.fn(),
  },
  excludeFields: <T, K extends keyof T>(obj: T, fields: K[]) => {
    const copy = { ...obj };
    fields.forEach((f) => delete copy[f]);
    return copy;
  },
}));

vi.mock("../../../generated/prisma/client.js", () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    empty: { strings: [""], values: [] },
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(message: string, opts: { code: string }) {
        super(message);
        this.code = opts.code;
      }
    },
  },
}));

vi.mock("../team/team.service.js", () => ({
  getTeamById: vi.fn(),
  getTeamIdsByUserId: vi.fn(),
}));
vi.mock("../../utils/commonUtils.js", () => ({
  getShortUrlId: vi.fn(() => "SHORT001"),
  shortIdUniqueConstraintErrHandler: vi.fn((fn, ...args) => fn(...args)),
}));
vi.mock("./survey.utils.js", () => ({
  isShortId: (id: string) => id.length === 8,
  getSurveysOrgId: vi.fn(),
  createSurveyDefaultVariableForQuestion: vi.fn(),
}));
vi.mock("../question/question.utils.js", () => ({
  getInitialSurveyQuestions: vi.fn(() => []),
  getQuestionsArrUpdatedWithLanguageTypeQuestion: vi.fn(async (questions) => questions),
}));
vi.mock("../question/question.service.js", () => ({
  updateQuestionsOnSurvey: vi.fn(),
}));
vi.mock("../surveyTheme/defaultTheme.js", () => ({
  defaultWebSurveyPagesTheme: { welcome: {} },
}));
vi.mock("../subscription/subscription.service.js", () => ({
  hasFeature: vi.fn(),
}));
vi.mock("../stats/stats.service.js", () => ({
  createStats: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { getTeamById, getTeamIdsByUserId } from "../team/team.service.js";
import { hasFeature } from "../subscription/subscription.service.js";
import { updateQuestionsOnSurvey } from "../question/question.service.js";
import { createStats } from "../stats/stats.service.js";
import { getQuestionsArrUpdatedWithLanguageTypeQuestion } from "../question/question.utils.js";
import { getSurveysOrgId } from "./survey.utils.js";
import { QuestionType, SurveyType, SurveyVariableType } from "../../types/enums.js";
import {
  cloneSurvey,
  createSurvey,
  createSurveyVariable,
  deleteSurveyById,
  deleteSurveyFromTeam,
  deleteSurveyVariable,
  endSurveyCronAction,
  getActiveSurveysSummmaryByUserId,
  getGoogleUrlBySurveyTeamMapId,
  getNPSResponsesForGraph,
  getPhoneBySurveyTeamMapId,
  getPublicSurveyById,
  getSurveyById,
  getSurveyBylandingId,
  getSurveyByTeamMapId,
  getSurveyLandingByUserId,
  getSurveyLanguagesFromTeamId,
  getSurveyResponseCountForGraph,
  getSurveysByTeam,
  getSurveysByUserId,
  getSurveysSummmaryByUserId,
  getSurveyStats,
  getSurveyStatsBySurveyTeamMapId,
  getSurveyTemplates,
  getSurveyVariables,
  getWebSurveysByUserId,
  getWhatsappSurveysByUserId,
  publishSurveyCronAction,
  saveSheetIdToSurvey,
  updateCompletedSurvey,
  updateGoogleLink,
  updateReviewLinkVisitedOnSurvey,
  updateStartedSurvey,
  updateSurveyById,
  updateSurveyPassword,
  updateSurveyVariable,
  updateSurveyVariables,
  updateVisitedSurvey,
  verifySurveyPassword,
} from "./survey.service.js";

const db = prisma as unknown as Record<string, any>;
const getTeamByIdMock = getTeamById as unknown as ReturnType<typeof vi.fn>;
const getTeamIdsMock = getTeamIdsByUserId as unknown as ReturnType<typeof vi.fn>;
const hasFeatureMock = hasFeature as unknown as ReturnType<typeof vi.fn>;
const updateQuestionsMock = updateQuestionsOnSurvey as unknown as ReturnType<typeof vi.fn>;
const createStatsMock = createStats as unknown as ReturnType<typeof vi.fn>;
const getSurveysOrgIdMock = getSurveysOrgId as unknown as ReturnType<typeof vi.fn>;
const updateLangQuestionsMock =
  getQuestionsArrUpdatedWithLanguageTypeQuestion as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: every feature is enabled, so googleReview stripping stays off unless a test opts in.
  hasFeatureMock.mockResolvedValue(true);
  getTeamIdsMock.mockResolvedValue(["team-1"]);
  updateLangQuestionsMock.mockImplementation(async (questions: unknown) => questions);
});

const req = { user: { userId: "user-1", email: "a@b.com", orgId: "org-1" } };

describe("createSurvey", () => {
  test("creates a survey with a short url per team and bumps the web survey counter", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValue({ id: "theme-default" });
    db.survey.create.mockResolvedValue({ id: "survey-1", type: SurveyType.Web });
    getTeamByIdMock.mockResolvedValue({ orgId: "org-1" });

    const res = await createSurvey(
      { title: "T", languages: ["en"], teamIds: ["team-1", "team-2"] } as any,
      req,
    );

    const createArg = db.survey.create.mock.calls[0][0].data;
    expect(createArg.teams.create).toEqual([
      { teamId: "team-1", shortUrlId: "SHORT001" },
      { teamId: "team-2", shortUrlId: "SHORT001" },
    ]);
    expect(createArg.createdBy).toBe("user-1");
    expect(createArg.notificationEmail).toBe("a@b.com");
    expect(createArg.webSurveyThemeId).toBe("theme-default");
    expect(db.usageStats.update).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      data: { surveysCount: { increment: 1 } },
    });
    expect(res).toMatchObject({ id: "survey-1" });
  });

  test("prefers the explicitly selected theme over the org default", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValue({ id: "theme-default" });
    db.survey.create.mockResolvedValue({ id: "survey-1", type: SurveyType.Web });
    getTeamByIdMock.mockResolvedValue({ orgId: "org-1" });

    await createSurvey(
      { title: "T", languages: ["en"], teamIds: ["team-1"], selectedTheme: "theme-x" } as any,
      req,
    );

    expect(db.survey.create.mock.calls[0][0].data.webSurveyThemeId).toBe("theme-x");
  });

  test("bumps the whatsapp counter instead for non-web surveys", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValue({ id: "theme-default" });
    db.survey.create.mockResolvedValue({ id: "survey-1", type: SurveyType.WhatsApp });
    getTeamByIdMock.mockResolvedValue({ orgId: "org-1" });

    await createSurvey(
      { title: "T", languages: ["en"], teamIds: ["team-1"], type: SurveyType.WhatsApp } as any,
      req,
    );

    expect(db.usageStats.update).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      data: { waSurveysCount: { increment: 1 } },
    });
  });

  test("skips usage accounting when no teams are supplied", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValue({ id: "theme-default" });
    db.survey.create.mockResolvedValue({ id: "survey-1", type: SurveyType.Web });

    await createSurvey({ title: "T", languages: ["en"], teamIds: [] } as any, req);

    expect(getTeamByIdMock).not.toHaveBeenCalled();
    expect(db.usageStats.update).not.toHaveBeenCalled();
  });

  test("delegates to cloneSurvey when a templateId is given, marking it as a template clone", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "tpl-1",
      title: "Category__Template Title",
      type: SurveyType.Web,
    });
    db.survey.findMany.mockResolvedValue([]);
    db.survey.create.mockResolvedValue({ id: "clone-1", teams: [] });
    getTeamByIdMock.mockResolvedValue({ orgId: "org-1" });

    const res = await createSurvey(
      { title: "ignored", teamIds: ["team-1"], templateId: "tpl-1" } as any,
      req,
    );

    // Template clones drop the "Category__" prefix instead of gaining a " Copy N" suffix.
    expect(db.survey.create.mock.calls[0][0].data.title).toBe("Template Title");
    expect(res).toMatchObject({ id: "clone-1" });
  });

  test("returns null when the create helper yields nothing", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValue({ id: "theme-default" });
    db.survey.create.mockResolvedValue(null);

    await expect(
      createSurvey({ title: "T", languages: ["en"], teamIds: ["team-1"] } as any, req),
    ).resolves.toBeNull();
  });
});

describe("cloneSurvey", () => {
  test("names the copy one past the highest existing copy number", async () => {
    db.survey.findUnique.mockResolvedValue({ id: "s1", title: "My Survey", type: SurveyType.Web });
    db.survey.findMany.mockResolvedValue([
      { title: "My Survey" },
      { title: "My Survey Copy 1" },
      { title: "My Survey Copy 4" },
      { title: "My Survey Copy notanumber" },
    ]);
    db.survey.create.mockResolvedValue({ id: "clone-1", teams: [] });
    getTeamByIdMock.mockResolvedValue({ orgId: "org-1" });

    await cloneSurvey("s1", "user-1", ["team-1"]);

    expect(db.survey.create.mock.calls[0][0].data.title).toBe("My Survey Copy 5");
  });

  test("starts at Copy 1 when no copies exist", async () => {
    db.survey.findUnique.mockResolvedValue({ id: "s1", title: "My Survey", type: SurveyType.Web });
    db.survey.findMany.mockResolvedValue([{ title: "My Survey" }]);
    db.survey.create.mockResolvedValue({ id: "clone-1", teams: [] });
    getTeamByIdMock.mockResolvedValue({ orgId: "org-1" });

    await cloneSurvey("s1", "user-1", ["team-1"]);

    expect(db.survey.create.mock.calls[0][0].data.title).toBe("My Survey Copy 1");
  });

  test("reassigns ownership, resets timestamps and mints fresh short urls", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      title: "My Survey",
      createdBy: "old-user",
      updatedAt: new Date("2020-01-01"),
    });
    db.survey.findMany.mockResolvedValue([]);
    db.survey.create.mockResolvedValue({ id: "clone-1", teams: [] });
    getTeamByIdMock.mockResolvedValue({ orgId: "org-1" });

    await cloneSurvey("s1", "user-2", ["team-1"]);

    const data = db.survey.create.mock.calls[0][0].data;
    expect(data.id).toBeUndefined();
    expect(data.createdBy).toBe("user-2");
    expect(data.updatedAt).toBeNull();
    expect(data.teams.create).toEqual([{ teamId: "team-1", shortUrlId: "SHORT001" }]);
  });

  test("seeds usage stats for the target org", async () => {
    db.survey.findUnique.mockResolvedValue({ id: "s1", title: "My Survey" });
    db.survey.findMany.mockResolvedValue([]);
    db.survey.create.mockResolvedValue({ id: "clone-1", teams: [] });
    getTeamByIdMock.mockResolvedValue({ orgId: "org-9" });

    await cloneSurvey("s1", "user-1", ["team-1"]);

    expect(createStatsMock).toHaveBeenCalledWith("org-9");
  });

  test("returns an error message when the source survey is missing", async () => {
    db.survey.findUnique.mockResolvedValue(null);

    await expect(cloneSurvey("missing", "user-1", ["team-1"])).resolves.toBe(
      "Survey not found to duplicate",
    );
    expect(db.survey.create).not.toHaveBeenCalled();
  });
});

describe("getSurveyById", () => {
  test("throws when no id is provided", async () => {
    await expect(getSurveyById("")).rejects.toThrow("ID must be provided");
    expect(db.survey.findUnique).not.toHaveBeenCalled();
  });

  test("throws when the survey does not exist", async () => {
    db.survey.findUnique.mockResolvedValue(null);
    await expect(getSurveyById("s1")).rejects.toThrow("Could not find survey with id s1");
  });

  test("flattens the team mappings into a team summary list", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      orgId: "org-1",
      questions: [],
      teams: [
        {
          id: "map-1",
          shortUrlId: "SHORT001",
          team: { id: "team-1", name: "Team One", code: "T1", tags: ["a"] },
        },
      ],
    });

    const res = await getSurveyById("s1", ["team-1"]);

    expect(res.teams).toEqual([
      {
        id: "team-1",
        name: "Team One",
        mapId: "map-1",
        code: "T1",
        tags: ["a"],
        shortUrlId: "SHORT001",
      },
    ]);
  });

  test("strips googleReview from every question when the org lacks the feature", async () => {
    hasFeatureMock.mockResolvedValue(false);
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      orgId: "org-1",
      questions: [{ id: "q1", googleReview: { link: "x" } }],
      teams: [],
    });

    await getSurveyById("s1");

    expect(updateQuestionsMock).toHaveBeenCalledWith("s1", [{ id: "q1", googleReview: null }]);
  });

  test("falls back to the theme's org when the survey has no orgId", async () => {
    hasFeatureMock.mockResolvedValue(true);
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      orgId: null,
      webSurveyTheme: { orgId: "org-from-theme" },
      questions: [],
      teams: [],
    });

    await getSurveyById("s1");

    expect(hasFeatureMock.mock.calls[0][0]).toBe("org-from-theme");
  });
});

describe("getPublicSurveyById", () => {
  const surveyTeamMap = {
    id: "map-1",
    teamId: "team-1",
    surveyId: "s1",
    survey: { id: "s1", orgId: "org-1", questions: [], title: "T" },
    team: { reviewPageLinks: { Google: "g.link" } },
  };

  test("looks up by shortUrlId when the id is 8 characters", async () => {
    db.surveyTeamMap.findUnique.mockResolvedValue(surveyTeamMap);
    db.team.findUnique.mockResolvedValue({ org: { logo: "logo.png", name: "Org" } });

    await getPublicSurveyById("abcd1234");

    expect(db.surveyTeamMap.findUnique.mock.calls[0][0].where).toEqual({ shortUrlId: "abcd1234" });
  });

  test("looks up by primary key for a full-length id", async () => {
    db.surveyTeamMap.findUnique.mockResolvedValue(surveyTeamMap);
    db.team.findUnique.mockResolvedValue({ org: { logo: "logo.png", name: "Org" } });

    await getPublicSurveyById("550e8400-e29b-41d4-a716-446655440000");

    expect(db.surveyTeamMap.findUnique.mock.calls[0][0].where).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  test("merges the survey with the org branding and review links", async () => {
    db.surveyTeamMap.findUnique.mockResolvedValue(surveyTeamMap);
    db.team.findUnique.mockResolvedValue({ org: { logo: "logo.png", name: "Org" } });

    const res = await getPublicSurveyById("map-1-full-id");

    expect(res).toMatchObject({
      surveyTeamMapId: "map-1",
      title: "T",
      orgLogo: "logo.png",
      orgName: "Org",
      reviewPageLinks: { Google: "g.link" },
    });
  });

  test("throws when the mapping is unknown", async () => {
    db.surveyTeamMap.findUnique.mockResolvedValue(null);
    await expect(getPublicSurveyById("nope")).rejects.toThrow("Could not find survey with id nope");
  });

  test("strips googleReview when the org lacks the feature", async () => {
    hasFeatureMock.mockResolvedValue(false);
    db.surveyTeamMap.findUnique.mockResolvedValue({
      ...surveyTeamMap,
      survey: { ...surveyTeamMap.survey, questions: [{ id: "q1", googleReview: { link: "x" } }] },
    });
    db.team.findUnique.mockResolvedValue({ org: {} });

    await getPublicSurveyById("map-1-full-id");

    expect(updateQuestionsMock).toHaveBeenCalledWith("s1", [{ id: "q1", googleReview: null }]);
  });
});

describe("getPhoneBySurveyTeamMapId", () => {
  test("returns the org's first whatsapp phone number", async () => {
    db.surveyTeamMap.findUnique.mockResolvedValue({
      team: { org: { WhatsappSettings: [{ phone: "+15550001" }] } },
    });

    await expect(getPhoneBySurveyTeamMapId("abcd1234")).resolves.toBe("+15550001");
    expect(db.surveyTeamMap.findUnique.mock.calls[0][0].where).toEqual({ shortUrlId: "abcd1234" });
  });

  test("returns undefined when no whatsapp settings exist", async () => {
    db.surveyTeamMap.findUnique.mockResolvedValue({ team: { org: { WhatsappSettings: [] } } });
    await expect(getPhoneBySurveyTeamMapId("map-1-full-id")).resolves.toBeUndefined();
  });

  test("returns undefined when the mapping is missing", async () => {
    db.surveyTeamMap.findUnique.mockResolvedValue(null);
    await expect(getPhoneBySurveyTeamMapId("map-1-full-id")).resolves.toBeUndefined();
  });
});

describe("getSurveyBylandingId", () => {
  test("returns the surveys referenced by the landing page", async () => {
    db.surveyLanding.findUnique.mockResolvedValue({ id: "l1", surveys: ["s1", "s2"] });
    db.survey.findMany.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);

    const res = await getSurveyBylandingId("l1");

    expect(db.survey.findMany).toHaveBeenCalledWith({ where: { id: { in: ["s1", "s2"] } } });
    expect(res).toHaveLength(2);
  });

  test("throws when the landing page has no surveys", async () => {
    db.surveyLanding.findUnique.mockResolvedValue({ id: "l1", surveys: [] });
    db.survey.findMany.mockResolvedValue([]);

    await expect(getSurveyBylandingId("l1")).rejects.toThrow("Could not find survey with id l1");
  });
});

describe("survey listing helpers", () => {
  test("getSurveysByUserId reshapes team mappings and honours the include flags", async () => {
    db.survey.findMany.mockResolvedValue([
      {
        id: "s1",
        teams: [
          {
            id: "map-1",
            teamId: "team-1",
            shortUrlId: "SHORT001",
            team: { name: "T1" },
            _count: { responses: 3 },
          },
        ],
      },
    ]);

    const res = await getSurveysByUserId("user-1", true, true);

    const select = db.survey.findMany.mock.calls[0][0].select;
    expect(select.questions).toBe(true);
    expect(select.teams.select._count.select.responses).toBe(true);
    expect(res[0].teams).toEqual([
      {
        id: "team-1",
        name: "T1",
        mapId: "map-1",
        shortUrlId: "SHORT001",
        responsesCount: { responses: 3 },
      },
    ]);
  });

  test("getSurveysByUserId omits questions and response counts by default", async () => {
    db.survey.findMany.mockResolvedValue([]);

    await getSurveysByUserId("user-1");

    const select = db.survey.findMany.mock.calls[0][0].select;
    expect(select.questions).toBe(false);
    expect(select.teams.select._count.select.responses).toBe(false);
  });

  test("getWebSurveysByUserId keeps only web surveys and drops questions/password", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([
      { teamId: "team-1", survey: { id: "s1", type: "web", questions: [], password: "pw" } },
      { teamId: "team-1", survey: { id: "s2", type: "whatsapp", questions: [], password: "pw" } },
    ]);

    const res = await getWebSurveysByUserId("user-1");

    expect(res).toEqual([{ id: "s1", type: "web", teamId: "team-1" }]);
  });

  test("getWhatsappSurveysByUserId filters by the requested type", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([
      { teamId: "team-1", survey: { id: "s1", type: "web", questions: [], password: "pw" } },
      { teamId: "team-1", survey: { id: "s2", type: "whatsapp", questions: [], password: "pw" } },
    ]);

    const res = await getWhatsappSurveysByUserId("user-1", "whatsapp");

    expect(res).toEqual([{ id: "s2", type: "whatsapp", teamId: "team-1" }]);
  });

  test("getSurveyLandingByUserId scopes landing pages to their creator", async () => {
    db.surveyLanding.findMany.mockResolvedValue([{ id: "l1" }]);

    await expect(getSurveyLandingByUserId("user-1")).resolves.toEqual([{ id: "l1" }]);
    expect(db.surveyLanding.findMany).toHaveBeenCalledWith({ where: { createdBy: "user-1" } });
  });

  test("getSurveysByTeam attaches the mapping id and hides questions/password", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([
      { id: "map-1", survey: { id: "s1", questions: [], password: "pw", title: "T" } },
    ]);

    const res = await getSurveysByTeam("team-1");

    expect(res).toEqual([{ id: "s1", title: "T", surveyTeamMapId: "map-1" }]);
  });

  test("getSurveyByTeamMapId returns the mapped survey", async () => {
    db.surveyTeamMap.findUnique.mockResolvedValue({ survey: { id: "s1" } });
    await expect(getSurveyByTeamMapId("map-1")).resolves.toEqual({ id: "s1" });
  });
});

describe("survey stats lookups", () => {
  test("getSurveyStatsBySurveyTeamMapId reads the unique stats row", async () => {
    db.surveyStats.findUnique.mockResolvedValue({ visited: 5 });

    await expect(getSurveyStatsBySurveyTeamMapId("map-1")).resolves.toEqual({ visited: 5 });
    expect(db.surveyStats.findUnique).toHaveBeenCalledWith({
      where: { surveyTeamMapId: "map-1" },
    });
  });

  test("getSurveyStats restricts stats to the teams the caller can see", async () => {
    db.surveyStats.findMany.mockResolvedValue([{ visited: 1 }]);

    await getSurveyStats("s1", ["team-1", "team-2"]);

    expect(db.surveyStats.findMany).toHaveBeenCalledWith({
      where: { surveyTeamMap: { surveyId: "s1", teamId: { in: ["team-1", "team-2"] } } },
    });
  });
});

describe("survey summaries", () => {
  const teamMapping = {
    id: "map-1",
    responses: [{ id: "r1", createdAt: new Date() }],
    surveyStats: { started: 2, completed: 1, visited: 5 },
    team: { id: "team-1", name: "T1" },
  };

  test("getActiveSurveysSummmaryByUserId counts all surveys but lists only active ones", async () => {
    db.survey.count.mockResolvedValue(7);
    db.survey.findMany.mockResolvedValue([
      { id: "s1", active: true, title: "A", teams: [teamMapping] },
    ]);

    const res = await getActiveSurveysSummmaryByUserId("user-1");

    expect(res.totalSurveysCount).toBe(7);
    expect(res.activeSurveysCount).toBe(1);
    expect(res.totalTeamsCount).toBe(1);
    expect(res.surveys[0].teamMapIds).toEqual([
      { teamMapId: "map-1", teamName: "T1", teamId: "team-1" },
    ]);
    expect(db.survey.findMany.mock.calls[0][0].where.active).toBe(true);
  });

  test("getSurveysSummmaryByUserId aggregates response counts across teams", async () => {
    db.survey.findMany.mockResolvedValue([
      {
        id: "s1",
        active: true,
        title: "A",
        teams: [
          {
            id: "map-1",
            _count: { responses: 2 },
            surveyStats: {},
            team: { id: "team-1", name: "T1" },
          },
          {
            id: "map-2",
            _count: { responses: 3 },
            surveyStats: {},
            team: { id: "team-2", name: "T2" },
          },
        ],
      },
      { id: "s2", active: false, title: "B", teams: [] },
    ]);

    const res = await getSurveysSummmaryByUserId("user-1");

    expect(res.totalSurveysCount).toBe(2);
    expect(res.activeSurveysCount).toBe(1);
    expect(res.surveys[0].responseCount).toBe(5);
    expect(res.surveys[1].responseCount).toBe(0);
  });
});

describe("getSurveyTemplates", () => {
  test("groups templates by the prefix before '__' and strips it from the title", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([
      { survey: { id: "t1", type: "web", title: "Retail__Store Feedback" } },
      { survey: { id: "t2", type: "web", title: "Retail__Checkout" } },
      { survey: { id: "t3", type: "web", title: "Health__Clinic" } },
      { survey: { id: "t4", type: "whatsapp", title: "Retail__Wa" } },
    ]);

    const res = await getSurveyTemplates("web");

    expect(Object.keys(res)).toEqual(["Retail", "Health"]);
    expect(res.Retail.map((s: any) => s.title)).toEqual(["Store Feedback", "Checkout"]);
    expect(res.Health[0].title).toBe("Clinic");
  });

  test("returns an empty grouping when nothing matches the requested type", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([
      { survey: { id: "t1", type: "web", title: "Retail__A" } },
    ]);

    await expect(getSurveyTemplates("whatsapp")).resolves.toEqual({});
  });
});

describe("deleteSurveyById", () => {
  test("deletes the survey and decrements the web survey counter", async () => {
    getSurveysOrgIdMock.mockResolvedValue("org-1");
    db.survey.delete.mockResolvedValue({ id: "s1", type: SurveyType.Web });

    const res = await deleteSurveyById("s1");

    expect(db.survey.delete).toHaveBeenCalledWith({
      where: { id: "s1" },
      include: { teams: true },
    });
    expect(db.usageStats.update).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      data: { surveysCount: { decrement: 1 } },
    });
    expect(res).toMatchObject({ id: "s1" });
  });

  test("decrements the whatsapp counter for non-web surveys", async () => {
    getSurveysOrgIdMock.mockResolvedValue("org-1");
    db.survey.delete.mockResolvedValue({ id: "s1", type: SurveyType.WhatsApp });

    await deleteSurveyById("s1");

    expect(db.usageStats.update).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      data: { waSurveysCount: { decrement: 1 } },
    });
  });
});

describe("deleteSurveyFromTeam", () => {
  test("detaches only the mapping when the survey belongs to several teams", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([{ teamId: "team-1" }, { teamId: "team-2" }]);
    db.surveyTeamMap.findFirst.mockResolvedValue({ id: "map-1", responses: [] });
    db.surveyTeamMap.delete.mockResolvedValue({ id: "map-1" });

    const res = await deleteSurveyFromTeam("s1", { teamId: "team-1" } as any);

    expect(db.surveyTeamMap.delete).toHaveBeenCalledWith({ where: { id: "map-1" } });
    expect(db.survey.delete).not.toHaveBeenCalled();
    expect(res).toEqual({ id: "map-1" });
  });

  test("deletes the whole survey and decrements usage when it is the last team", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([{ teamId: "team-1" }]);
    db.surveyTeamMap.findFirst.mockResolvedValue({ id: "map-1", responses: [] });
    db.survey.delete.mockResolvedValue({ id: "s1", type: SurveyType.Web });
    getTeamByIdMock.mockResolvedValue({ orgId: "org-1" });

    await deleteSurveyFromTeam("s1", { teamId: "team-1" } as any);

    expect(db.survey.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
    expect(db.usageStats.update).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      data: { surveysCount: { decrement: 1 } },
    });
  });

  test("refuses when the mapping does not exist", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([{ teamId: "team-1" }]);
    db.surveyTeamMap.findFirst.mockResolvedValue(null);

    await expect(deleteSurveyFromTeam("s1", { teamId: "team-9" } as any)).rejects.toThrow(
      "No survey found with the provided id and teamId",
    );
  });

  test("refuses to delete a team survey that already has responses", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([{ teamId: "team-1" }, { teamId: "team-2" }]);
    db.surveyTeamMap.findFirst.mockResolvedValue({ id: "map-1", responses: [{ id: "r1" }] });

    await expect(deleteSurveyFromTeam("s1", { teamId: "team-1" } as any)).rejects.toThrow(
      "Cannot delete survey that has responses",
    );
    expect(db.surveyTeamMap.delete).not.toHaveBeenCalled();
  });
});

describe("updateSurveyById", () => {
  const validQuestion = {
    id: "q1",
    type: QuestionType.Text,
    title: { en: "Question one" },
  };

  test("marks a plain edit as action 'edit'", async () => {
    db.survey.findUnique.mockResolvedValue({ id: "s1", questions: [validQuestion] });
    db.survey.update.mockResolvedValue({ id: "s1", createdAt: new Date("2025-01-01") });

    const res = await updateSurveyById("s1", { title: "New" } as any);

    expect(res).toMatchObject({ status: "success", action: "edit" });
  });

  test("marks isPublished:false as action 'unpublish' and skips validation", async () => {
    db.survey.findUnique.mockResolvedValue({ id: "s1", questions: [] });
    db.survey.update.mockResolvedValue({ id: "s1", createdAt: new Date("2025-01-01") });

    const res = await updateSurveyById("s1", { isPublished: false } as any);

    expect(res).toMatchObject({ status: "success", action: "unpublish" });
  });

  test("refuses to publish a survey with no real questions", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      languages: ["en"],
      // Page entries (Welcome/ThankYou) do not count as questions.
      questions: [{ id: "p1", type: "Welcome", title: { en: "Hi" } }],
    });

    const res = await updateSurveyById("s1", { isPublished: true } as any);

    expect(res).toEqual({ status: "failed", data: { error: "No questions found." } });
    expect(db.survey.update).not.toHaveBeenCalled();
  });

  test("blocks publishing when a question is missing a translated title", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      languages: ["en", "fr"],
      questions: [{ id: "q1", type: QuestionType.Text, title: { en: "Hello" } }],
    });

    const res: any = await updateSurveyById("s1", { isPublished: true } as any);

    expect(res.status).toBe("failed");
    expect(res.data[0].errors).toEqual(["Missing title for languages: fr"]);
    expect(db.survey.update).not.toHaveBeenCalled();
  });

  test("blocks publishing when a choice question has fewer than 2 choices", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      languages: ["en"],
      questions: [
        { id: "q1", type: QuestionType.MCQ, title: { en: "Pick" }, choices: { en: ["only"] } },
      ],
    });

    const res: any = await updateSurveyById("s1", { isPublished: true } as any);

    expect(res.status).toBe("failed");
    expect(res.data[0].errors).toContain("Minimum 2 choices required for all languages.");
  });

  test("blocks publishing when languages have unequal choice counts", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      languages: ["en", "fr"],
      questions: [
        {
          id: "q1",
          type: QuestionType.MCQ,
          title: { en: "Pick", fr: "Choisir" },
          choices: { en: ["a", "b", "c"], fr: ["a", "b"] },
        },
      ],
    });

    const res: any = await updateSurveyById("s1", { isPublished: true } as any);

    expect(res.status).toBe("failed");
    expect(res.data[0].errors).toContain("All languages must have 3 choices.");
  });

  test("blocks publishing when a choice question has no choices at all", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      languages: ["en"],
      questions: [{ id: "q1", type: QuestionType.MSQ, title: { en: "Pick" } }],
    });

    const res: any = await updateSurveyById("s1", { isPublished: true } as any);

    expect(res.data[0].errors).toContain("Choices are required but missing for some languages.");
  });

  test("blocks publishing when a MultiTextInput question has no fields", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      languages: ["en"],
      questions: [{ id: "q1", type: QuestionType.MultiTextInput, title: { en: "Details" } }],
    });

    const res: any = await updateSurveyById("s1", { isPublished: true } as any);

    expect(res.data[0].errors).toContain("fields are missing");
  });

  test("blocks publishing when MultiTextInput fields miss a language", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      languages: ["en", "fr"],
      questions: [
        {
          id: "q1",
          type: QuestionType.MultiTextInput,
          title: { en: "Details", fr: "Details" },
          features: { en: { fields: ["name"] }, fr: { fields: [] } },
        },
      ],
    });

    const res: any = await updateSurveyById("s1", { isPublished: true } as any);

    expect(res.data[0].errors).toContain("fields are required, but missing for languages: fr");
  });

  test("groups every error of one question under a single entry", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      languages: ["en", "fr"],
      questions: [
        { id: "q1", type: QuestionType.MCQ, title: { en: "Pick" }, choices: { en: ["a"] } },
      ],
    });

    const res: any = await updateSurveyById("s1", { isPublished: true } as any);

    expect(res.data).toHaveLength(1);
    expect(res.data[0].id).toBe("q1");
    expect(res.data[0].errors.length).toBeGreaterThan(1);
  });

  test("publishes when validation passes and reports action 'publish'", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      languages: ["en"],
      questions: [validQuestion],
    });
    db.survey.update.mockResolvedValue({ id: "s1", createdAt: new Date("2025-01-01") });

    const res = await updateSurveyById("s1", { isPublished: true } as any);

    expect(res).toMatchObject({ status: "success", action: "publish" });
    expect(db.survey.update).toHaveBeenCalled();
  });

  test("treats a scheduled publish (surveyPublishAt) as a publish action", async () => {
    db.survey.findUnique.mockResolvedValue({
      id: "s1",
      languages: ["en"],
      questions: [validQuestion],
    });
    db.survey.update.mockResolvedValue({ id: "s1", createdAt: new Date("2025-01-01") });

    const res = await updateSurveyById("s1", { surveyPublishAt: new Date() } as any);

    expect(res).toMatchObject({ action: "publish" });
  });

  test("attaches newly added teams with a fresh short url and leaves existing ones alone", async () => {
    db.survey.findUnique.mockResolvedValue({ id: "s1", questions: [validQuestion] });
    db.survey.update.mockResolvedValue({ id: "s1", createdAt: new Date("2025-01-01") });
    db.surveyTeamMap.findMany.mockResolvedValue([{ teamId: "team-1" }]);

    await updateSurveyById("s1", { teams: ["team-1", "team-2"] } as any);

    expect(db.surveyTeamMap.createMany).toHaveBeenCalledWith({
      data: [{ surveyId: "s1", teamId: "team-2", shortUrlId: "SHORT001" }],
    });
    expect(db.surveyTeamMap.delete).not.toHaveBeenCalled();
  });

  test("leaves shortUrlId null for surveys created before the short-url rollout", async () => {
    db.survey.findUnique.mockResolvedValue({ id: "s1", questions: [validQuestion] });
    db.survey.update.mockResolvedValue({ id: "s1", createdAt: new Date(2023, 5, 1) });
    db.surveyTeamMap.findMany.mockResolvedValue([]);

    await updateSurveyById("s1", { teams: ["team-2"] } as any);

    expect(db.surveyTeamMap.createMany.mock.calls[0][0].data[0].shortUrlId).toBeNull();
  });

  test("detaches teams that are no longer listed", async () => {
    db.survey.findUnique.mockResolvedValue({ id: "s1", questions: [validQuestion] });
    db.survey.update.mockResolvedValue({ id: "s1", createdAt: new Date("2025-01-01") });
    db.surveyTeamMap.findMany.mockResolvedValue([{ teamId: "team-1" }, { teamId: "team-2" }]);
    db.surveyTeamMap.findFirst.mockResolvedValue({ id: "map-2", responses: [] });

    await updateSurveyById("s1", { teams: ["team-1"] } as any);

    expect(db.surveyTeamMap.delete).toHaveBeenCalledWith({ where: { id: "map-2" } });
  });

  test("refuses to detach a team whose survey already has responses", async () => {
    db.survey.findUnique.mockResolvedValue({ id: "s1", questions: [validQuestion] });
    db.survey.update.mockResolvedValue({ id: "s1", createdAt: new Date("2025-01-01") });
    db.surveyTeamMap.findMany.mockResolvedValue([{ teamId: "team-1" }, { teamId: "team-2" }]);
    db.surveyTeamMap.findFirst.mockResolvedValue({ id: "map-2", responses: [{ id: "r1" }] });

    await expect(updateSurveyById("s1", { teams: ["team-1"] } as any)).rejects.toThrow(
      "Remove team failed. Team survey has responses",
    );
  });

  test("refreshes language-type questions before persisting", async () => {
    db.survey.findUnique.mockResolvedValue({ id: "s1", questions: [validQuestion] });
    db.survey.update.mockResolvedValue({ id: "s1", createdAt: new Date("2025-01-01") });
    updateLangQuestionsMock.mockResolvedValue([{ id: "rebuilt" }]);

    await updateSurveyById("s1", { languages: ["en", "fr"] } as any);

    expect(updateLangQuestionsMock).toHaveBeenCalledWith([validQuestion], ["en", "fr"]);
    expect(db.survey.update.mock.calls[0][0].data.questions).toEqual([{ id: "rebuilt" }]);
  });

  test("never forwards the teams key to prisma.survey.update", async () => {
    db.survey.findUnique.mockResolvedValue({ id: "s1", questions: [validQuestion] });
    db.survey.update.mockResolvedValue({ id: "s1", createdAt: new Date("2025-01-01") });
    db.surveyTeamMap.findMany.mockResolvedValue([{ teamId: "team-1" }]);

    await updateSurveyById("s1", { title: "New", teams: ["team-1"] } as any);

    expect(db.survey.update.mock.calls[0][0].data).not.toHaveProperty("teams");
  });
});

describe("google link handling", () => {
  test("getGoogleUrlBySurveyTeamMapId prefers the team's explicit googleLink", async () => {
    db.surveyTeamMap.findUnique.mockResolvedValue({
      team: { googleLink: "https://direct", reviewPageLinks: { Google: "https://fallback" } },
    });

    await expect(getGoogleUrlBySurveyTeamMapId("map-1")).resolves.toBe("https://direct");
  });

  test("getGoogleUrlBySurveyTeamMapId falls back to the review page link", async () => {
    db.surveyTeamMap.findUnique.mockResolvedValue({
      team: { googleLink: "", reviewPageLinks: { Google: "https://fallback" } },
    });

    await expect(getGoogleUrlBySurveyTeamMapId("map-1")).resolves.toBe("https://fallback");
  });

  test("updateGoogleLink writes the link onto the mapping's team", async () => {
    db.surveyTeamMap.findUnique.mockResolvedValue({ teamId: "team-1" });
    db.team.update.mockResolvedValue({ id: "team-1", googleLink: "https://g" });

    const res = await updateGoogleLink("map-1", { googleLink: "https://g" } as any);

    expect(db.team.update).toHaveBeenCalledWith({
      where: { id: "team-1" },
      data: { googleLink: "https://g" },
    });
    expect(res).toMatchObject({ googleLink: "https://g" });
  });

  test("updateGoogleLink reports an error when the mapping is missing", async () => {
    db.surveyTeamMap.findUnique.mockResolvedValue(null);

    await expect(updateGoogleLink("map-1", { googleLink: "https://g" } as any)).resolves.toEqual({
      error: "Survey not found",
    });
    expect(db.team.update).not.toHaveBeenCalled();
  });
});

describe("survey password", () => {
  test("setting a password marks the survey protected", async () => {
    db.survey.update.mockResolvedValue({ id: "s1", isProtected: true });

    await updateSurveyPassword("s1", { password: "hunter2" } as any);

    expect(db.survey.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { password: "hunter2", isProtected: true },
    });
  });

  test("the _remove_pwd sentinel clears the password and the protection flag", async () => {
    db.survey.update.mockResolvedValue({ id: "s1", isProtected: false });

    await updateSurveyPassword("s1", { password: "_remove_pwd" } as any);

    expect(db.survey.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { password: "", isProtected: false },
    });
  });

  test("propagates database failures", async () => {
    db.survey.update.mockRejectedValue(new Error("db down"));

    await expect(updateSurveyPassword("s1", { password: "x" } as any)).rejects.toThrow("db down");
  });

  test("verifySurveyPassword grants access on an exact match", async () => {
    db.survey.findUnique.mockResolvedValue({ isProtected: true, password: "hunter2" });

    await expect(verifySurveyPassword("s1", { password: "hunter2" } as any)).resolves.toBe(
      "Access granted",
    );
  });

  test("verifySurveyPassword rejects a wrong password", async () => {
    db.survey.findUnique.mockResolvedValue({ isProtected: true, password: "hunter2" });

    await expect(verifySurveyPassword("s1", { password: "nope" } as any)).rejects.toThrow(
      "Password Error",
    );
  });

  test("verifySurveyPassword rejects when the survey is not protected", async () => {
    db.survey.findUnique.mockResolvedValue({ isProtected: false, password: "hunter2" });

    await expect(verifySurveyPassword("s1", { password: "hunter2" } as any)).rejects.toThrow(
      "Password Error",
    );
  });

  test("verifySurveyPassword reports a missing survey", async () => {
    db.survey.findUnique.mockResolvedValue(null);

    await expect(verifySurveyPassword("s1", { password: "x" } as any)).rejects.toThrow(
      "Survey not found",
    );
  });
});

describe("funnel counters", () => {
  beforeEach(() => {
    db.surveyStats.upsert.mockResolvedValue({ id: "stats-1" });
  });

  test("updateVisitedSurvey increments visited, seeding the row at 1", async () => {
    await updateVisitedSurvey("map-1");

    expect(db.surveyStats.upsert).toHaveBeenCalledWith({
      where: { surveyTeamMapId: "map-1" },
      update: { visited: { increment: 1 } },
      create: { surveyTeamMapId: "map-1", visited: 1 },
    });
  });

  test("updateStartedSurvey backfills visited when the row is new", async () => {
    await updateStartedSurvey("map-1");

    expect(db.surveyStats.upsert.mock.calls[0][0].create).toEqual({
      surveyTeamMapId: "map-1",
      started: 1,
      visited: 1,
    });
  });

  test("updateCompletedSurvey backfills the whole funnel when the row is new", async () => {
    await updateCompletedSurvey("map-1");

    expect(db.surveyStats.upsert.mock.calls[0][0].create).toEqual({
      surveyTeamMapId: "map-1",
      completed: 1,
      visited: 1,
      started: 1,
    });
  });

  test("updateReviewLinkVisitedOnSurvey increments the review-link counter", async () => {
    await updateReviewLinkVisitedOnSurvey("map-1");

    expect(db.surveyStats.upsert.mock.calls[0][0].update).toEqual({
      reviewLinkVisited: { increment: 1 },
    });
  });
});

describe("misc survey mutations", () => {
  test("saveSheetIdToSurvey stores the spreadsheet id", async () => {
    db.survey.update.mockResolvedValue({ id: "s1", spreadSheetId: "sheet-1" });

    await saveSheetIdToSurvey("sheet-1", "s1");

    expect(db.survey.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { spreadSheetId: "sheet-1" },
    });
  });

  test("getSurveyLanguagesFromTeamId de-duplicates languages across a team's surveys", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([
      { survey: { languages: ["en", "fr"] } },
      { survey: { languages: ["fr", "de"] } },
    ]);

    await expect(getSurveyLanguagesFromTeamId("team-1")).resolves.toEqual(["en", "fr", "de"]);
  });
});

describe("survey variables", () => {
  test("createSurveyVariable persists name/type/value against the survey", async () => {
    db.surveyVariables.create.mockResolvedValue({ id: "v1" });

    await createSurveyVariable("s1", {
      name: "Q1_response",
      type: SurveyVariableType.DEFAULT,
      value: "q1",
    } as any);

    expect(db.surveyVariables.create).toHaveBeenCalledWith({
      data: { name: "Q1_response", type: SurveyVariableType.DEFAULT, value: "q1", surveyId: "s1" },
    });
  });

  test("getSurveyVariables lists variables of a survey", async () => {
    db.surveyVariables.findMany.mockResolvedValue([{ id: "v1" }]);

    await expect(getSurveyVariables("s1")).resolves.toEqual([{ id: "v1" }]);
    expect(db.surveyVariables.findMany).toHaveBeenCalledWith({ where: { surveyId: "s1" } });
  });

  test("updateSurveyVariable patches by variable id", async () => {
    db.surveyVariables.update.mockResolvedValue({ id: "v1", name: "new" });

    await updateSurveyVariable("v1", { name: "new" });

    expect(db.surveyVariables.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { name: "new" },
    });
  });

  test("deleteSurveyVariable removes by variable id", async () => {
    db.surveyVariables.delete.mockResolvedValue({ id: "v1" });

    await deleteSurveyVariable("v1");

    expect(db.surveyVariables.delete).toHaveBeenCalledWith({ where: { id: "v1" } });
  });

  test("updateSurveyVariables rebuilds only the DEFAULT variables, in question order", async () => {
    const { createSurveyDefaultVariableForQuestion } = await import("./survey.utils.js");
    const createDefaultMock = createSurveyDefaultVariableForQuestion as unknown as ReturnType<
      typeof vi.fn
    >;

    await updateSurveyVariables("s1", [{ id: "q1" }, { id: "q2" }]);

    expect(db.surveyVariables.deleteMany).toHaveBeenCalledWith({
      where: { type: SurveyVariableType.DEFAULT, surveyId: "s1" },
    });
    expect(createDefaultMock).toHaveBeenNthCalledWith(1, "s1", { id: "q1" }, 0);
    expect(createDefaultMock).toHaveBeenNthCalledWith(2, "s1", { id: "q2" }, 1);
  });
});

describe("publish/end cron actions", () => {
  test("publishSurveyCronAction publishes every due, unpublished survey", async () => {
    db.survey.findMany.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);
    db.survey.update.mockResolvedValue({});

    await publishSurveyCronAction();

    const where = db.survey.findMany.mock.calls[0][0].where;
    expect(where.NOT).toEqual({ surveyPublishAt: null });
    expect(where.AND[0]).toEqual({ isPublished: false });
    expect(db.survey.update).toHaveBeenCalledTimes(2);
    expect(db.survey.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { isPublished: true },
    });
  });

  test("publishSurveyCronAction is a no-op when nothing is due", async () => {
    db.survey.findMany.mockResolvedValue([]);

    await publishSurveyCronAction();

    expect(db.survey.update).not.toHaveBeenCalled();
  });

  test("endSurveyCronAction unpublishes due surveys and clears the scheduled publish time", async () => {
    db.survey.findMany.mockResolvedValue([{ id: "s1" }]);
    db.survey.update.mockResolvedValue({});

    await endSurveyCronAction();

    expect(db.survey.findMany.mock.calls[0][0].where.AND[0]).toEqual({ isPublished: true });
    expect(db.survey.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { isPublished: false, surveyPublishAt: null },
    });
  });

  test("both cron actions use a 5 minute look-ahead buffer", async () => {
    db.survey.findMany.mockResolvedValue([]);

    const before = Date.now();
    await publishSurveyCronAction();
    const lte = db.survey.findMany.mock.calls[0][0].where.AND[1].surveyPublishAt.lte as Date;

    expect(lte.getTime()).toBeGreaterThanOrEqual(before + 5 * 60000 - 1000);
    expect(lte.getTime()).toBeLessThanOrEqual(Date.now() + 5 * 60000 + 1000);
  });
});

describe("getSurveyResponseCountForGraph", () => {
  test("hourly returns all 24 hour buckets, zero-filling the missing ones", async () => {
    const firstHour = dayjs().hour(0).format("hh A");
    db.$queryRaw.mockResolvedValue([{ date: firstHour, responses: 4 }]);

    const res = await getSurveyResponseCountForGraph("org-1", "UTC", "hourly");

    expect(res).toHaveLength(24);
    expect(res[0]).toEqual({ date: firstHour, responses: 4 });
    expect(res.filter((r: any) => r.responses === 0)).toHaveLength(23);
  });

  test("daily returns 30 buckets ending today", async () => {
    const today = dayjs().format("MMM DD");
    db.$queryRaw.mockResolvedValue([{ date: today, responses: 7 }]);

    const res = await getSurveyResponseCountForGraph("org-1", "UTC", "daily");

    expect(res).toHaveLength(30);
    expect(res[29]).toEqual({ date: today, responses: 7 });
  });

  test("weekly returns 53 buckets indexed by weeks-ago", async () => {
    db.$queryRaw.mockResolvedValue([{ date: 0, responses: 2 }]);

    const res = await getSurveyResponseCountForGraph("org-1", "UTC", "weekly");

    expect(res).toHaveLength(53);
    expect(res[52]).toEqual({ date: 0, responses: 2 });
    expect(res[0]).toEqual({ date: 52, responses: 0 });
  });

  test("returns null for an unsupported time period", async () => {
    await expect(getSurveyResponseCountForGraph("org-1", "UTC", "yearly")).resolves.toBeNull();
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
});

describe("getNPSResponsesForGraph", () => {
  function seedSurvey(questions: any[], type = SurveyType.Web) {
    db.surveyTeamMap.findFirst.mockResolvedValue({
      survey: { type, questions, WaFlow: null },
    });
  }

  test("returns an error marker when the survey has no team mapping", async () => {
    db.surveyTeamMap.findFirst.mockResolvedValue(null);

    await expect(
      getNPSResponsesForGraph("org-1", "UTC", "daily", "s1", [], ["team-1"]),
    ).resolves.toEqual({ e: "no response" });
  });

  test("classifies opinion-scale answers into promoter/passive/detractor and scores them", async () => {
    seedSurvey([{ id: "q1", type: QuestionType.Opinion }]);
    const createdAt = dayjs().subtract(5, "day").toDate();
    db.$queryRaw.mockResolvedValue([
      { createdAt, responses: [{ questionId: "q1", response: { [QuestionType.Opinion]: 10 } }] },
      { createdAt, responses: [{ questionId: "q1", response: { [QuestionType.Opinion]: 8 } }] },
      { createdAt, responses: [{ questionId: "q1", response: { [QuestionType.Opinion]: 2 } }] },
    ]);

    const res: any[] = (await getNPSResponsesForGraph(
      "org-1",
      "UTC",
      "daily",
      "s1",
      [],
      ["team-1"],
    )) as any[];

    const bucket = res.find((r) => r.total > 0);
    expect(bucket).toMatchObject({ promoters: 1, passives: 1, detractors: 1, total: 3 });
    // (1 promoter - 1 detractor) / 3 responses => 0
    expect(bucket.npsScore).toBe(0);
    expect(bucket.happinessIndex).toBeCloseTo(10 / 3);
  });

  test("computes a positive NPS when promoters outnumber detractors", async () => {
    seedSurvey([{ id: "q1", type: QuestionType.Rating }]);
    const createdAt = dayjs().subtract(5, "day").toDate();
    db.$queryRaw.mockResolvedValue([
      {
        createdAt,
        responses: [
          { questionId: "q1", response: { [QuestionType.Rating]: 5 } },
          { questionId: "q1", response: { [QuestionType.Rating]: 5 } },
          { questionId: "q1", response: { [QuestionType.Rating]: 4 } },
          { questionId: "q1", response: { [QuestionType.Rating]: 1 } },
        ],
      },
    ]);

    const res: any[] = (await getNPSResponsesForGraph(
      "org-1",
      "UTC",
      "daily",
      "s1",
      [],
      ["team-1"],
    )) as any[];

    const bucket = res.find((r) => r.total > 0);
    expect(bucket).toMatchObject({ promoters: 2, passives: 1, detractors: 1, total: 4 });
    expect(bucket.npsScore).toBe(25);
  });

  test("maps smiley answers onto the promoter/passive/detractor scale", async () => {
    seedSurvey([{ id: "q1", type: QuestionType.Smiley }]);
    const createdAt = dayjs().subtract(5, "day").toDate();
    db.$queryRaw.mockResolvedValue([
      {
        createdAt,
        responses: [
          { questionId: "q1", response: { [QuestionType.Smiley]: "Very Happy" } },
          { questionId: "q1", response: { [QuestionType.Smiley]: "Neutral" } },
          { questionId: "q1", response: { [QuestionType.Smiley]: "Sad" } },
        ],
      },
    ]);

    const res: any[] = (await getNPSResponsesForGraph(
      "org-1",
      "UTC",
      "daily",
      "s1",
      [],
      ["team-1"],
    )) as any[];

    expect(res.find((r) => r.total > 0)).toMatchObject({
      promoters: 1,
      passives: 1,
      detractors: 1,
    });
  });

  test("treats Like/Yes as promoters and everything else as detractors", async () => {
    seedSurvey([
      { id: "q1", type: QuestionType.LD },
      { id: "q2", type: QuestionType.YN },
    ]);
    const createdAt = dayjs().subtract(5, "day").toDate();
    db.$queryRaw.mockResolvedValue([
      {
        createdAt,
        responses: [
          { questionId: "q1", response: { [QuestionType.LD]: "Like" } },
          { questionId: "q1", response: { [QuestionType.LD]: "Dislike" } },
          { questionId: "q2", response: { [QuestionType.YN]: "Yes" } },
          { questionId: "q2", response: { [QuestionType.YN]: "No" } },
        ],
      },
    ]);

    const res: any[] = (await getNPSResponsesForGraph(
      "org-1",
      "UTC",
      "daily",
      "s1",
      [],
      ["team-1"],
    )) as any[];

    expect(res.find((r) => r.total > 0)).toMatchObject({
      promoters: 2,
      detractors: 2,
      total: 4,
    });
  });

  test("ignores answers whose question is not an NPS-style question", async () => {
    seedSurvey([{ id: "q1", type: QuestionType.Opinion }]);
    const createdAt = dayjs().subtract(5, "day").toDate();
    db.$queryRaw.mockResolvedValue([
      {
        createdAt,
        responses: [{ questionId: "unrelated", response: { [QuestionType.Text]: "hi" } }],
      },
    ]);

    const res: any[] = (await getNPSResponsesForGraph(
      "org-1",
      "UTC",
      "daily",
      "s1",
      [],
      ["team-1"],
    )) as any[];

    expect(res.every((r) => r.total === 0)).toBe(true);
  });

  test("zero-fills every bucket when there are no responses at all", async () => {
    seedSurvey([{ id: "q1", type: QuestionType.Opinion }]);
    db.$queryRaw.mockResolvedValue([]);

    const hourly: any[] = (await getNPSResponsesForGraph(
      "org-1",
      "UTC",
      "hourly",
      "s1",
      [],
      ["team-1"],
    )) as any[];
    const weekly: any[] = (await getNPSResponsesForGraph(
      "org-1",
      "UTC",
      "weekly",
      "s1",
      [],
      ["team-1"],
    )) as any[];

    expect(hourly).toHaveLength(24);
    expect(weekly).toHaveLength(53);
    expect([...hourly, ...weekly].every((r) => r.total === 0 && r.npsScore === 0)).toBe(true);
  });

  test("averages numeric answers into avgNPSRating", async () => {
    seedSurvey([{ id: "q1", type: QuestionType.Opinion }]);
    const createdAt = dayjs().subtract(5, "day").toDate();
    // A plain numeric response (not keyed by question type) still counts toward the average.
    db.$queryRaw.mockResolvedValue([
      {
        createdAt,
        responses: [
          { questionId: "q1", response: 10 },
          { questionId: "q1", response: "6" },
        ],
      },
    ]);

    const res: any[] = (await getNPSResponsesForGraph(
      "org-1",
      "UTC",
      "daily",
      "s1",
      [],
      ["team-1"],
    )) as any[];

    expect(res.find((r) => r.total > 0).avgNPSRating).toBe(8);
  });
});
