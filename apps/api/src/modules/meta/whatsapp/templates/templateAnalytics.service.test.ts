import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const store = new Map<string, string>();
vi.mock("../../../../utils/redisConnection.js", () => ({
  default: {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
      return "OK";
    }),
  },
}));
vi.mock("../../../../utils/prisma.js", () => ({
  default: { waTemplate: { findMany: vi.fn() } },
}));
vi.mock("../../../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../settings/settings.service.js", () => ({ getWaSettings: vi.fn() }));
vi.mock("../wa_axios.js", () => {
  class GraphApiError extends Error {
    error = { message: "not enabled" };
  }
  return { callMetaApi: vi.fn(), GraphApiError };
});

import prisma from "../../../../utils/prisma.js";
import { getWaSettings } from "../settings/settings.service.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import {
  enableInsights,
  getInsightsStatus,
  getTemplateAnalytics,
  summarise,
} from "./templateAnalytics.service.js";

const meta = vi.mocked(callMetaApi);
const findMany = vi.mocked(prisma.waTemplate.findMany);
const DAY1 = Date.UTC(2026, 9, 20) / 1000;
const DAY2 = Date.UTC(2026, 9, 21) / 1000;

const ok = (data: unknown) => ({ data }) as never;

beforeEach(() => {
  store.clear();
  meta.mockReset();
  findMany.mockReset();
  vi.mocked(getWaSettings).mockResolvedValue({
    phoneId: "phone-1",
    wabaId: "waba-1",
    accessToken: "tok",
  } as never);
});

describe("summarise", () => {
  test("adds up days, splits clicks by button and keeps unique clicks apart", () => {
    const rows = summarise(
      [
        {
          template_id: "m1",
          start: DAY2,
          end: DAY2 + 86400,
          sent: 5,
          delivered: 4,
          read: 2,
          clicked: [
            { type: "url_button", button_content: "Shop", count: 3 },
            { type: "unique_url_button", button_content: "Shop", count: 2 },
          ],
          cost: [{ type: "amount_spent", value: 0.25 }],
        },
        {
          template_id: "m1",
          start: DAY1,
          end: DAY1 + 86400,
          sent: 10,
          delivered: 9,
          read: 6,
          clicked: [{ type: "quick_reply_button", button_content: "Stop", count: 1 }],
          cost: [
            { type: "amount_spent", value: 0.5 },
            { type: "cost_per_delivered", value: 0.05 },
          ],
        },
        { template_id: "unknown", start: DAY1, end: DAY1 + 86400, sent: 99 },
      ],
      new Map([["m1", "t1"]]),
    );

    const t1 = rows.get("t1")!;
    expect(rows.size).toBe(1);
    expect(t1).toMatchObject({ sent: 15, delivered: 13, read: 8, clicks: 4, amountSpent: 0.75 });
    expect(t1.buttons).toEqual([
      { button: "Shop", type: "url", clicks: 3, uniqueClicks: 2 },
      { button: "Stop", type: "quick_reply", clicks: 1, uniqueClicks: null },
    ]);
    // Sorted oldest first whatever order Meta answered in.
    expect(t1.daily.map((d) => d.date)).toEqual(["2026-10-20", "2026-10-21"]);
    expect(t1.daily[1].clicks).toBe(3);
  });

  test("leaves cost null when Meta sent none", () => {
    const rows = summarise(
      [{ template_id: "m1", start: DAY1, end: DAY1 + 86400, sent: 1 }],
      new Map([["m1", "t1"]]),
    );
    expect(rows.get("t1")!.amountSpent).toBeNull();
  });
});

describe("getTemplateAnalytics", () => {
  const templates = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `t${i}`, data: { id: `m${i}` } }));

  test("asks Meta ten templates at a time", async () => {
    findMany.mockResolvedValue(templates(12) as never);
    meta.mockImplementation(async (url) =>
      url === "/waba-1" ? ok({ is_enabled_for_insights: true }) : ok({ data: [] }),
    );

    await getTemplateAnalytics("org-1", {
      phoneId: "phone-1",
      templateIds: templates(12).map((t) => t.id),
      days: 30,
    });

    const calls = meta.mock.calls.filter(([url]) => url === "/waba-1/template_analytics");
    expect(calls).toHaveLength(2);
    expect(JSON.parse(calls[0][6].template_ids)).toHaveLength(10);
    expect(JSON.parse(calls[1][6].template_ids)).toHaveLength(2);
    expect(calls[0][6].granularity).toBe("DAILY");
  });

  test("only looks at the org's templates on that number", async () => {
    findMany.mockResolvedValue([]);
    meta.mockResolvedValue(ok({ is_enabled_for_insights: true }));

    await getTemplateAnalytics("org-1", { phoneId: "phone-1", templateIds: ["t1"], days: 7 });

    expect(findMany.mock.calls[0][0]!.where).toEqual({
      orgId: "org-1",
      whatsappSettingsPhoneId: "phone-1",
      id: { in: ["t1"] },
    });
  });

  test("calls nothing but the flag when the account has not opted in", async () => {
    meta.mockResolvedValue(ok({ is_enabled_for_insights: false }));

    const res = await getTemplateAnalytics("org-1", {
      phoneId: "phone-1",
      templateIds: ["t1"],
      days: 7,
    });

    expect(res.status).toBe("disabled");
    expect(meta).toHaveBeenCalledTimes(1);
    expect(findMany).not.toHaveBeenCalled();
  });

  test("treats a refusal as not enabled when the flag could not be read", async () => {
    findMany.mockResolvedValue(templates(1) as never);
    meta.mockImplementation(async (url) => {
      if (url === "/waba-1") return ok({});
      throw new GraphApiError({} as never);
    });

    const res = await getTemplateAnalytics("org-1", {
      phoneId: "phone-1",
      templateIds: ["t0"],
      days: 7,
    });
    expect(res.status).toBe("disabled");
  });

  test("serves a repeat request from the cache", async () => {
    findMany.mockResolvedValue(templates(1) as never);
    meta.mockImplementation(async (url) =>
      url === "/waba-1" ? ok({ is_enabled_for_insights: true }) : ok({ data: [] }),
    );
    const input = { phoneId: "phone-1", templateIds: ["t0"], days: 7 };

    await getTemplateAnalytics("org-1", input);
    await getTemplateAnalytics("org-1", input);

    expect(meta.mock.calls.filter(([url]) => url.endsWith("template_analytics"))).toHaveLength(1);
  });

  test("refuses a number from another org instead of falling back", async () => {
    vi.mocked(getWaSettings).mockResolvedValue({ phoneId: "other", wabaId: "w" } as never);
    await expect(
      getTemplateAnalytics("org-1", { phoneId: "phone-1", templateIds: ["t0"], days: 7 }),
    ).rejects.toThrow("WhatsApp number not found");
  });
});

describe("date range", () => {
  // Meta rounds start back to 00:00 UTC and refuses anything past 90 days.
  test("starts at a UTC midnight no more than 90 days back", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T08:21:59Z"));
    try {
      findMany.mockResolvedValue([{ id: "t0", data: { id: "m0" } }] as never);
      meta.mockImplementation(async (url) =>
        url === "/waba-1" ? ok({ is_enabled_for_insights: true }) : ok({ data: [] }),
      );

      const res = await getTemplateAnalytics("org-1", {
        phoneId: "phone-1",
        templateIds: ["t0"],
        days: 90,
      });

      const params = meta.mock.calls.find(([url]) => url.endsWith("template_analytics"))![6];
      expect(params.start % 86400).toBe(0);
      expect(Date.UTC(2026, 9, 28) / 1000 - params.start).toBe(89 * 86400);
      expect(res.from).toBe("2026-07-31");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("insights opt-in", () => {
  test("enabling posts the flag to the WhatsApp account", async () => {
    meta.mockResolvedValue(ok({ success: true }));

    await enableInsights("org-1", "phone-1");

    expect(meta).toHaveBeenCalledWith(
      "/waba-1",
      "POST",
      "tok",
      undefined,
      {},
      {},
      {
        is_enabled_for_insights: true,
      },
    );
    // Remembered, so the status check does not ask Meta again.
    meta.mockClear();
    expect(await getInsightsStatus("org-1", "phone-1")).toBe("enabled");
    expect(meta).not.toHaveBeenCalled();
  });

  test("an unreadable flag is unknown, not an error", async () => {
    meta.mockRejectedValue(new Error("boom"));
    expect(await getInsightsStatus("org-1", "phone-1")).toBe("unknown");
  });
});
