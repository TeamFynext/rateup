import { describe, expect, test, vi } from "vitest";

/**
 * INJ-1: the response listing's filters used to be concatenated into SQL text and spliced
 * in with Prisma.raw. Every request value must now travel as a bound parameter.
 */

vi.mock("../../utils/prisma.js", () => ({ default: { $queryRaw: vi.fn() } }));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../stats/stats.service.js", () => ({ updateMonthlyStat: vi.fn() }));
vi.mock("../subscription/subscription.service.js", () => ({ hasFeature: vi.fn() }));
vi.mock("../webhook/webhook.service.js", () => ({ enqueueSurveyResponseWebhook: vi.fn() }));

import prisma from "../../utils/prisma.js";
import {
  buildResponseFilterSql,
  getSurveyResponseBySurveyId,
  sendResponseToWebhook,
} from "./response.service.js";
import { hasFeature } from "../subscription/subscription.service.js";
import { enqueueSurveyResponseWebhook } from "../webhook/webhook.service.js";
import { responseFilterQuery } from "./response.schema.js";

const SURVEY = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const MAP = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";
const QUESTION = "9f8e7d6c-5b4a-4392-8172-6a5b4c3d2e1f";
const PAYLOAD = 'x\' OR 1=1; DROP TABLE "Survey"; --';

function parse(query: Record<string, string>) {
  return responseFilterQuery.parse(query);
}

describe("buildResponseFilterSql", () => {
  test.each(["language", "tag", "mobile"])("a quote in %s is bound, not spliced", (key) => {
    const sql = buildResponseFilterSql(parse({ [key]: PAYLOAD }));

    expect(sql.sql).not.toContain("OR 1=1");
    expect(sql.sql).not.toContain("DROP TABLE");
    expect(sql.values.some((v) => typeof v === "string" && v.includes(PAYLOAD))).toBe(true);
  });

  test("a per-question search is bound, including its comma-separated IN list", () => {
    const single = buildResponseFilterSql(parse({ [QUESTION]: PAYLOAD }));
    expect(single.sql).not.toContain("DROP TABLE");
    expect(single.values).toContain(QUESTION);

    const list = buildResponseFilterSql(parse({ [QUESTION]: "a',b" }));
    expect(list.sql).not.toContain("a'");
    expect(list.values).toEqual(expect.arrayContaining(["a'", "b"]));
  });

  test("LIKE wildcards in a search match literally", () => {
    const sql = buildResponseFilterSql(parse({ mobile: "50%_" }));
    expect(sql.values).toContain("%50\\%\\_%");
  });

  test("id lists are bound uuids", () => {
    const sql = buildResponseFilterSql(parse({ surveyTeamMapIds: `${MAP},${MAP}` }));
    expect(sql.sql).not.toContain(MAP);
    expect(sql.values).toEqual([MAP, MAP]);
  });

  test("dates are parameters, and an unparseable date adds no clause", () => {
    const sql = buildResponseFilterSql(parse({ dateRange: "2026-01-01,2026-01-31" }));
    expect(sql.values).toHaveLength(2);
    expect(sql.sql).not.toContain("2026");

    expect(buildResponseFilterSql(parse({ createdAt: "not a date" })).sql).toBe("");
  });

  test("no filters adds nothing", () => {
    expect(buildResponseFilterSql(parse({ page: "0", limit: "10" })).sql).toBe("");
  });

  test("the whole query reaches Postgres with the payload only among the bound values", async () => {
    const queryRaw = prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>;
    queryRaw.mockResolvedValue([]);

    await getSurveyResponseBySurveyId(SURVEY, [MAP], parse({ language: PAYLOAD, tag: PAYLOAD }));

    const [strings, ...values] = queryRaw.mock.calls[0];
    const text = (strings as string[]).join("?");
    expect(text).not.toContain("DROP TABLE");
    expect(JSON.stringify(values)).toContain("DROP TABLE");
  });
});

describe("responseFilterQuery", () => {
  test("rejects id lists that are not uuids", () => {
    expect(responseFilterQuery.safeParse({ contactIds: "x'::uuid) OR (1=1" }).success).toBe(false);
    expect(responseFilterQuery.safeParse({ campaignIds: `${MAP},nope` }).success).toBe(false);
  });

  test("rejects question-filter keys outside the id alphabet", () => {
    expect(responseFilterQuery.safeParse({ "q') OR 1=1 --": "x" }).success).toBe(false);
    expect(responseFilterQuery.safeParse({ [QUESTION]: "x" }).success).toBe(true);
    // v2 WhatsApp flow answers are keyed by element name, not a uuid.
    expect(responseFilterQuery.safeParse({ screen_one_rating_0: "5" }).success).toBe(true);
  });

  test("rejects non-string question filters", () => {
    expect(responseFilterQuery.safeParse({ [QUESTION]: ["a", "b"] }).success).toBe(false);
  });
});

describe("sendResponseToWebhook plan gate (SURV-16)", () => {
  const response = {
    language: "en",
    responses: [],
    surveyTeamMap: {
      survey: { responseWebhookEndpoint: "https://hooks.example/x", questions: [] },
    },
  } as never;

  test("an org without the webhook feature sends nothing", async () => {
    (hasFeature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await sendResponseToWebhook(response, "org-1");

    expect(enqueueSurveyResponseWebhook).not.toHaveBeenCalled();
  });
});
