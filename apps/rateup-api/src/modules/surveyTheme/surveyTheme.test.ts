import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    webSurveyTheme: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    survey: { update: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { checkSession } from "../../utils/checkSession.js";
import { defaultTheme, defaultThemeOld, defaultWebSurveyPagesTheme } from "./defaultTheme.js";
import {
  createAndApplyThemeToSurvey,
  deleteThemeInDB,
  getAllThemesOfUserOrgFromDB,
  getSurveyThemeById,
  renameThemeInDB,
  ThemeAccessError,
  updateSurveyThemeActiveSurveyThemeInDB,
} from "./surveyTheme.service.js";
import {
  createNewTheme,
  deleteTheme,
  errorHandler,
  getAllThemesOfUserOrg,
  getSurveyThemeByIdHandler,
  renameTheme,
  updateSurveyThemeHandler,
} from "./surveyTheme.controller.js";
import { surveyThemeRoutes } from "./surveyTheme.routes.js";
import { getImgUrl } from "./utils.js";
import {
  createThemeBodySchema,
  renameThemeBodySchema,
  themeIdParamsSchema,
  updateActiveThemeBodySchema,
} from "./surveyTheme.schema.js";
import type { FastifyError } from "fastify";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  webSurveyTheme: Record<string, Mock>;
  survey: Record<string, Mock>;
  $transaction: Mock;
};

const ORG = "11111111-1111-1111-1111-111111111111";
const VICTIM_ORG = "22222222-2222-2222-2222-222222222222";
const VICTIM_THEME = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";
const VICTIM_SURVEY = "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d";

function reply() {
  const rep: any = { code: vi.fn(() => rep), status: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return {
    code: rep.code.mock.calls[0]?.[0] ?? rep.status.mock.calls[0]?.[0],
    body: rep.send.mock.calls[0]?.[0],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.webSurveyTheme.create.mockResolvedValue({ id: "theme-1", name: "New" });
  db.webSurveyTheme.findFirst.mockResolvedValue({ name: "Brand" });
  db.webSurveyTheme.findMany.mockResolvedValue([]);
  db.webSurveyTheme.findUnique.mockResolvedValue(null);
  db.webSurveyTheme.update.mockResolvedValue({ id: VICTIM_THEME });
  db.webSurveyTheme.delete.mockResolvedValue({ id: VICTIM_THEME });
  db.survey.update.mockResolvedValue({ id: VICTIM_SURVEY });
  db.survey.findFirst.mockResolvedValue({ id: VICTIM_SURVEY });
  db.$transaction.mockImplementation(async (fn: any) => fn(db));
});

// ===========================================================================
// Writing another org's theme
// ===========================================================================

describe("updateSurveyThemeActiveSurveyThemeInDB", () => {
  const req = (over: any = {}) => ({
    params: { webSurveyThemeId: VICTIM_THEME },
    body: { surveyId: VICTIM_SURVEY, theme: { surveyTheme: { title: { title: "<h3>Hi</h3>" } } } },
    user: { orgId: ORG },
    ...over,
  });

  // The theme id came from the path, the survey id from the body, and neither
  // was resolved to an org — so a theme id was enough for any authenticated user
  // to replace another organisation's theme JSON. getAllThemesOfUserOrgFromDB in
  // the same file already filtered on orgId. See issues.txt 33.1.
  test("selects the theme within the caller's org", async () => {
    await updateSurveyThemeActiveSurveyThemeInDB(req());

    expect(db.webSurveyTheme.findFirst.mock.calls[0][0].where).toEqual({
      id: VICTIM_THEME,
      orgId: ORG,
    });
    expect(db.webSurveyTheme.update.mock.calls[0][0].where).toEqual({
      id: VICTIM_THEME,
      orgId: ORG,
    });
  });

  test("refuses a theme belonging to another org", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValueOnce(null);

    await expect(updateSurveyThemeActiveSurveyThemeInDB(req())).rejects.toBeInstanceOf(
      ThemeAccessError,
    );
    expect(db.webSurveyTheme.update).not.toHaveBeenCalled();
    expect(db.survey.update).not.toHaveBeenCalled();
  });

  // Theme titles are stored as raw HTML — defaultTheme.ts holds
  // `<h3 ...>Welcome</h3><p ...>` — so the theme JSON is markup that the public
  // survey page renders. The tenancy check is what stops it being another org's
  // page; the shape of the JSON itself is still unconstrained (33.4).
  test("stores whatever JSON the body carried, markup included", async () => {
    const theme = {
      surveyTheme: { title: { title: `<img src=x onerror="fetch('https://evil.test')">` } },
    };

    await updateSurveyThemeActiveSurveyThemeInDB(req({ body: { surveyId: VICTIM_SURVEY, theme } }));

    expect(db.webSurveyTheme.update.mock.calls[0][0].data).toEqual({ theme });
  });

  test("the shipped page themes are themselves markup", () => {
    expect((defaultThemeOld as any).welcomeTheme.title.title).toContain("<h3");
    expect((defaultThemeOld as any).thankyouTheme.title.title).toContain("<p");
    expect((defaultWebSurveyPagesTheme as any).languageTheme.title.title).toContain("<h3");
  });

  // defaultTheme — the value createAndApplyThemeToSurvey writes — holds only
  // surveyTheme, while the deleted converter dereferenced welcomeTheme.logo and
  // thankyouTheme. That mismatch is why the migration endpoint went rather than
  // being re-enabled. See issues.txt 33.6.
  test("the theme new rows are seeded with has only the survey page", () => {
    expect(Object.keys(defaultTheme)).toEqual(["surveyTheme"]);
    expect(Object.keys(defaultThemeOld)).toContain("welcomeTheme");
  });

  // The survey update ran unconditionally and was keyed on the body's surveyId
  // with no org condition, so any survey could be pointed at any theme.
  test("applies the theme only to a survey in the caller's org", async () => {
    await updateSurveyThemeActiveSurveyThemeInDB(req());

    expect(db.survey.findFirst.mock.calls[0][0].where).toEqual({
      id: VICTIM_SURVEY,
      OR: [{ orgId: ORG }, { teams: { some: { team: { orgId: ORG } } } }],
    });
    expect(db.survey.update).toHaveBeenCalledWith({
      where: { id: VICTIM_SURVEY },
      data: { webSurveyThemeId: VICTIM_THEME },
    });
  });

  test("refuses a survey belonging to another org", async () => {
    db.survey.findFirst.mockResolvedValueOnce(null);

    await expect(updateSurveyThemeActiveSurveyThemeInDB(req())).rejects.toMatchObject({
      status: 404,
    });
    expect(db.survey.update).not.toHaveBeenCalled();
  });

  test("the handler takes the org from the session and answers 404", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValueOnce(null);
    const rep = reply();

    await updateSurveyThemeHandler(
      {
        params: { webSurveyThemeId: VICTIM_THEME },
        body: { surveyId: VICTIM_SURVEY, theme: {} },
        user: { orgId: ORG },
      } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 404,
      body: { success: false, message: "Theme not found" },
    });
  });

  test("a request with no session org is refused rather than run unscoped", async () => {
    await expect(updateSurveyThemeActiveSurveyThemeInDB(req({ user: {} }))).rejects.toMatchObject({
      status: 403,
    });
    expect(db.webSurveyTheme.findFirst).not.toHaveBeenCalled();
  });

  // The only thing standing between a caller and overwriting a theme used to be
  // this comparison against the display name — and the rename endpoint was the
  // way past it (33.2). It is now a second line, behind the org check.
  test("a theme named Default Theme is left alone", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValueOnce({ name: "Default Theme" });

    const res = await updateSurveyThemeActiveSurveyThemeInDB(req());

    expect(db.webSurveyTheme.update).not.toHaveBeenCalled();
    expect(res).toEqual({ success: true, message: "Applied theme succesfully." });
  });

  test("the guard is an exact string match", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValueOnce({ name: "default theme" });

    await updateSurveyThemeActiveSurveyThemeInDB(req());

    expect(db.webSurveyTheme.update).toHaveBeenCalledOnce();
  });

  // An unknown theme id used to skip the theme write but still repoint the
  // survey; now it is a refusal before either write.
  test("an unknown theme id repoints nothing", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValueOnce(null);

    await expect(updateSurveyThemeActiveSurveyThemeInDB(req())).rejects.toBeInstanceOf(
      ThemeAccessError,
    );
    expect(db.survey.update).not.toHaveBeenCalled();
  });

  test("the two writes share one transaction", async () => {
    await updateSurveyThemeActiveSurveyThemeInDB(req());

    expect(db.$transaction).toHaveBeenCalledOnce();
  });
});

// ===========================================================================
// renameThemeInDB — the update body used to be spread wholesale
// ===========================================================================

describe("renameThemeInDB", () => {
  test("selects the theme within the caller's org", async () => {
    await renameThemeInDB({
      params: { webSurveyThemeId: VICTIM_THEME },
      body: { name: "Renamed" },
      user: { orgId: ORG },
    });

    expect(db.webSurveyTheme.update.mock.calls[0][0].where).toEqual({
      id: VICTIM_THEME,
      orgId: ORG,
    });
  });

  // `data: { ...body }` with no body schema on the route made PATCH a write to
  // any column of WebSurveyTheme: an orgId stole the theme into the attacker's
  // org, a theme was 33.1 through an endpoint without even the Default Theme
  // check, and a createdAt rewrote the audit timestamp. See issues.txt 33.2.
  test("writes the name and nothing else", async () => {
    await renameThemeInDB({
      params: { webSurveyThemeId: VICTIM_THEME },
      body: { name: "Renamed", orgId: VICTIM_ORG, theme: { injected: true } } as never,
      user: { orgId: ORG },
    });

    expect(db.webSurveyTheme.update.mock.calls[0][0].data).toEqual({ name: "Renamed" });
  });

  // Zod strips unknown keys rather than rejecting, which is what the route wants:
  // an orgId in the body never reaches the handler at all.
  test("the body schema strips any field but the name", () => {
    expect(renameThemeBodySchema.parse({ name: "x", orgId: VICTIM_ORG })).toEqual({ name: "x" });
    expect(renameThemeBodySchema.safeParse({ name: "" }).success).toBe(false);
    expect(renameThemeBodySchema.safeParse({}).success).toBe(false);
  });

  test("the handler still requires a name", async () => {
    const rep = reply();

    await renameTheme(
      { params: { webSurveyThemeId: VICTIM_THEME }, body: {}, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep).code).toBe(400);
    expect(db.webSurveyTheme.update).not.toHaveBeenCalled();
  });

  test("a foreign theme answers 404", async () => {
    db.webSurveyTheme.update.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found."), { code: "P2025" }),
    );
    const rep = reply();

    await renameTheme(
      {
        params: { webSurveyThemeId: VICTIM_THEME },
        body: { name: "x" },
        user: { orgId: ORG },
      } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 404,
      body: { success: false, message: "Theme not found" },
    });
  });
});

// ===========================================================================
// deleteThemeInDB
// ===========================================================================

describe("deleteThemeInDB", () => {
  // Any authenticated user could delete any organisation's theme by id, and the
  // endpoint reported "theme deleted successfully" to whoever asked — the
  // surveys using it lose their appearance. See issues.txt 33.3.
  test("scopes the delete to the caller's org", async () => {
    await deleteThemeInDB({ params: { webSurveyThemeId: VICTIM_THEME }, user: { orgId: ORG } });

    expect(db.webSurveyTheme.delete).toHaveBeenCalledWith({
      where: { id: VICTIM_THEME, orgId: ORG },
    });
  });

  test("a foreign theme answers 404 rather than success", async () => {
    db.webSurveyTheme.delete.mockRejectedValueOnce(
      Object.assign(new Error("Record to delete does not exist."), { code: "P2025" }),
    );
    const rep = reply();

    await deleteTheme(
      { params: { webSurveyThemeId: VICTIM_THEME }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 404,
      body: { success: false, message: "Theme not found" },
    });
  });

  test("a delete inside the org still reports success", async () => {
    const rep = reply();

    await deleteTheme(
      { params: { webSurveyThemeId: VICTIM_THEME }, user: { orgId: ORG } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 200,
      body: { success: true, message: "theme deleted successfully" },
    });
  });
});

// ===========================================================================
// The public read
// ===========================================================================

describe("getSurveyThemeById", () => {
  // Deliberately unauthenticated — the survey renderer needs the theme without a
  // session — so it stays keyed on the id alone.
  test("selects by id with no org condition", async () => {
    await getSurveyThemeById(VICTIM_THEME);

    expect(db.webSurveyTheme.findUnique).toHaveBeenCalledWith({ where: { id: VICTIM_THEME } });
  });

  test("the handler sends only the theme JSON", async () => {
    db.webSurveyTheme.findUnique.mockResolvedValueOnce({
      id: VICTIM_THEME,
      orgId: VICTIM_ORG,
      name: "Brand",
      theme: { surveyTheme: {} },
    });
    const rep = reply();

    await getSurveyThemeByIdHandler({ params: { webSurveyThemeId: VICTIM_THEME } } as never, rep);

    expect(answer(rep)).toEqual({ code: 200, body: { surveyTheme: {} } });
  });

  // The destructure had no null guard, so an id that resolved to nothing threw a
  // TypeError on a public route — the module's error handler turned that into a
  // 500, so every unknown id answered 500 rather than 404 and the log filled
  // with destructuring errors from anyone probing. See issues.txt 33.3.
  test("an id that does not resolve answers 404", async () => {
    const rep = reply();

    await getSurveyThemeByIdHandler({ params: { webSurveyThemeId: VICTIM_THEME } } as never, rep);

    expect(answer(rep)).toEqual({
      code: 404,
      body: { success: false, message: "Theme not found" },
    });
  });

  test("the module's error handler sends a fixed 500", () => {
    const rep = reply();

    errorHandler(new TypeError("Cannot destructure") as FastifyError, {} as never, rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
    expect(log.error).toHaveBeenCalled();
  });
});

// ===========================================================================
// The org-scoped reader and the creator
// ===========================================================================

describe("the scoped paths", () => {
  test("the listing filters on the caller's org", async () => {
    await getAllThemesOfUserOrgFromDB({ user: { orgId: ORG } });

    expect(db.webSurveyTheme.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG });
  });

  // NOTE: a request with no user yields `orgId: undefined`, and Prisma drops
  // undefined from a where clause — so the listing would return every org's
  // themes. The route hook makes this unreachable today.
  test("a missing session leaves the org filter undefined", async () => {
    await getAllThemesOfUserOrgFromDB({});

    expect(db.webSurveyTheme.findMany.mock.calls[0][0].where).toEqual({ orgId: undefined });
  });

  test("the listing marks themes already used by a survey", async () => {
    db.webSurveyTheme.findMany.mockResolvedValueOnce([
      { id: "t-1", name: "A", theme: {}, survey: [{ title: "NPS" }] },
      { id: "t-2", name: "B", theme: {}, survey: [] },
    ]);
    const rep = reply();

    await getAllThemesOfUserOrg({ user: { orgId: ORG } } as never, rep);

    expect(answer(rep).body.map((t: any) => t.activeInAnotherSurvey)).toEqual([true, false]);
    expect(answer(rep).body[0]).not.toHaveProperty("survey");
  });

  test("create stamps the caller's org and the shipped default", async () => {
    await createAndApplyThemeToSurvey({
      user: { orgId: ORG },
      body: { themeName: "Brand", surveyId: VICTIM_SURVEY },
    });

    expect(db.webSurveyTheme.create.mock.calls[0][0].data).toEqual({
      orgId: ORG,
      name: "Brand",
      theme: defaultTheme,
    });
  });

  // The theme was created in the caller's org and then applied to whatever
  // survey the body named — a narrower version of 33.1 that did not even need an
  // existing theme id. See issues.txt 33.7.
  test("create refuses a survey outside the caller's org", async () => {
    db.survey.findFirst.mockResolvedValueOnce(null);

    await expect(
      createAndApplyThemeToSurvey({
        user: { orgId: ORG },
        body: { themeName: "Brand", surveyId: VICTIM_SURVEY },
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.webSurveyTheme.create).not.toHaveBeenCalled();
  });

  test("both writes share one transaction", async () => {
    await createAndApplyThemeToSurvey({
      user: { orgId: ORG },
      body: { themeName: "Brand", surveyId: VICTIM_SURVEY },
    });

    expect(db.$transaction).toHaveBeenCalledOnce();
  });

  // The transaction always ran survey.update, so a create with no surveyId
  // failed inside it and rolled the new theme back — the optional parameter the
  // controller advertised could not actually be omitted. See issues.txt 33.7.
  test("a create with no surveyId keeps the theme and touches no survey", async () => {
    const theme = await createAndApplyThemeToSurvey({
      user: { orgId: ORG },
      body: { themeName: "Brand" },
    });

    expect(db.webSurveyTheme.create).toHaveBeenCalledOnce();
    expect(db.survey.update).not.toHaveBeenCalled();
    expect(db.survey.findFirst).not.toHaveBeenCalled();
    expect(theme).toEqual({ id: "theme-1", name: "New" });
  });

  test("a duplicate theme name in the org answers 400", async () => {
    db.webSurveyTheme.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );
    const rep = reply();

    await createNewTheme(
      { user: { orgId: ORG }, body: { themeName: "Brand", surveyId: VICTIM_SURVEY } } as never,
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 400,
      body: { success: false, message: "A theme with the same name already exists." },
    });
  });

  test("any other create failure is rethrown to the error handler", async () => {
    db.webSurveyTheme.create.mockRejectedValueOnce(new Error("db down"));

    await expect(
      createNewTheme(
        { user: { orgId: ORG }, body: { themeName: "Brand", surveyId: VICTIM_SURVEY } } as never,
        reply(),
      ),
    ).rejects.toThrow("db down");
  });
});

// ===========================================================================
// utils
// ===========================================================================

describe("getImgUrl", () => {
  test("passes an absolute url through", () => {
    expect(getImgUrl("https://cdn.test/a.png")).toBe("https://cdn.test/a.png");
    expect(getImgUrl("http://cdn.test/a.png")).toBe("http://cdn.test/a.png");
  });

  // NOTE: a hardcoded CloudFront host, over http, with the caller's string
  // appended and no encoding.
  test("prefixes a bare key with a hardcoded http CloudFront host", () => {
    expect(getImgUrl("images/a.png")).toBe("http://d2uj946b0i8y27.cloudfront.net/images/a.png");
  });

  test("treats a colour as not an image", () => {
    expect(getImgUrl("#f7f7f7")).toBe("");
  });

  test("an empty or absent value yields an empty string", () => {
    expect(getImgUrl("")).toBe("");
    expect(getImgUrl(undefined)).toBe("");
    expect(getImgUrl(null)).toBe("");
  });

  test("a path-traversal style key is appended unchanged", () => {
    expect(getImgUrl("../../etc/passwd")).toBe(
      "http://d2uj946b0i8y27.cloudfront.net/../../etc/passwd",
    );
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("surveyThemeRoutes", () => {
  async function collect() {
    const routes: any[] = [];
    let onRoute: any;
    const srv: any = {
      addHook: vi.fn((name, fn) => {
        if (name === "onRoute") onRoute = fn;
      }),
      setErrorHandler: vi.fn(),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
      patch: vi.fn((url, opts, handler) => routes.push({ method: "PATCH", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };

    await surveyThemeRoutes(srv);

    // Replay the hook Fastify would run for each registration, so the resolved
    // preHandler list is what the route would actually get.
    const resolved = routes.map((r) => {
      const routeOptions: any = { method: r.method, url: r.url, ...r.opts };
      onRoute(routeOptions);
      return { ...r, preHandler: routeOptions.preHandler };
    });
    return { srv, routes: resolved, onRoute };
  }

  // The seventh registration, POST /updateWebSurveyThemes, is gone — a root-org
  // endpoint that claimed to migrate every theme and was a no-op reporting
  // success. See issues.txt 33.6.
  test("registers six routes", async () => {
    const { routes } = await collect();

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /:webSurveyThemeId",
      "GET /",
      "POST /",
      "PUT /:webSurveyThemeId",
      "PATCH /:webSurveyThemeId",
      "DELETE /:webSurveyThemeId",
    ]);
  });

  // The by-id read is declared public, so the hook leaves its preHandler list
  // empty — the survey renderer has no session.
  test("leaves the by-id read unauthenticated", async () => {
    const { routes } = await collect();

    expect(routes[0].preHandler).toEqual([]);
  });

  test("puts checkSession on every other route", async () => {
    const { routes } = await collect();

    for (const r of routes.slice(1)) {
      expect(r.preHandler).toContain(checkSession);
    }
  });

  // The hook used to ASSIGN to routeOptions.preHandler, so any preHandler a
  // route declared for itself was silently discarded — the mechanism the whole
  // module's authentication rests on. See issues.txt 33.5.
  test("the hook appends to a route's own preHandler rather than replacing it", async () => {
    const { onRoute } = await collect();

    const own = vi.fn();
    const routeOptions: any = { preHandler: [own], config: {} };
    onRoute(routeOptions);

    expect(routeOptions.preHandler).toEqual([checkSession, own]);
  });

  test("a public route keeps its own preHandler too", async () => {
    const { onRoute } = await collect();

    const own = vi.fn();
    const routeOptions: any = { preHandler: own, config: { isPublic: true } };
    onRoute(routeOptions);

    expect(routeOptions.preHandler).toEqual([own]);
  });

  // Not one route declared a body or params schema, and the module's own
  // surveyTheme.schema.ts was not imported by the route file at all.
  // See issues.txt 33.4.
  test("every route validates its params, and every writer its body", async () => {
    const { routes } = await collect();

    const byUrl = Object.fromEntries(routes.map((r) => [`${r.method} ${r.url}`, r.opts?.schema]));
    expect(byUrl["GET /:webSurveyThemeId"].params).toBe(themeIdParamsSchema);
    expect(byUrl["POST /"].body).toBe(createThemeBodySchema);
    expect(byUrl["PUT /:webSurveyThemeId"].body).toBe(updateActiveThemeBodySchema);
    expect(byUrl["PATCH /:webSurveyThemeId"].body).toBe(renameThemeBodySchema);
    expect(byUrl["DELETE /:webSurveyThemeId"].params).toBe(themeIdParamsSchema);
  });

  // STILL OPEN (issues.txt 33.4): the theme body is declared but open. The four
  // page schemas in surveyTheme.schema.ts describe the LEGACY shape —
  // `bg.desktopbg` as a string — while defaultTheme.ts seeds `bg.desktopBg` as an
  // object, so attaching them would reject every real request. Reconciling them
  // needs the renderer's actual payload.
  test("the update body constrains the survey id but not the theme's shape", () => {
    expect(updateActiveThemeBodySchema.safeParse({ surveyId: "nope", theme: {} }).success).toBe(
      false,
    );
    expect(
      updateActiveThemeBodySchema.safeParse({
        surveyId: VICTIM_SURVEY,
        theme: { anything: "at all" },
      }).success,
    ).toBe(true);
  });

  test("the params schema requires a uuid", () => {
    expect(themeIdParamsSchema.safeParse({ webSurveyThemeId: "not-a-uuid" }).success).toBe(false);
    expect(themeIdParamsSchema.safeParse({ webSurveyThemeId: VICTIM_THEME }).success).toBe(true);
  });

  test("installs the module's own error handler", async () => {
    const { srv } = await collect();

    expect(srv.setErrorHandler).toHaveBeenCalledWith(errorHandler);
  });
});
