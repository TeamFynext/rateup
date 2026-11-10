import { describe, expect, test } from "vite-plus/test";
import { currentApiPath, LEGACY_API_PREFIXES, rewriteLegacyUrl } from "./legacyPaths.js";

describe("currentApiPath", () => {
  test.each([
    ["/api/contact", "/api/contacts"],
    ["/api/contact/abc?x=1", "/api/contacts/abc?x=1"],
    ["/api/contact?page=2", "/api/contacts?page=2"],
    ["/api/contact/group/g1", "/api/contacts/audiences/g1"],
    ["/api/contact/conversations/c1", "/api/inbox/conversations/c1"],
    ["/api/contact/conversation-tags", "/api/inbox/conversation-tags"],
    ["/api/wa/inbox/message/count", "/api/inbox/message/count"],
    ["/api/wa/calls/ringing", "/api/inbox/calls/ringing"],
    ["/api/wa/automated-reply/rule/r1", "/api/automation/rules/r1"],
    ["/api/chatbots/j1/clone", "/api/automation/journeys/j1/clone"],
    ["/api/wa/settings/conversational-automation/p1/sync", "/api/whatsapp/ice-breakers/p1/sync"],
    ["/api/wa/settings/p1", "/api/whatsapp/settings/p1"],
    ["/api/wa/instagram-profile/c1", "/api/instagram/profile/c1"],
    ["/api/wa/instagram/i1/media/m1/comments", "/api/instagram/i1/media/m1/comments"],
    ["/api/wa/catalog/products/c1", "/api/commerce/catalogs/products/c1"],
    ["/api/question/s1/reorder", "/api/surveys/s1/questions/reorder"],
    ["/api/question/s1", "/api/surveys/s1/questions"],
    ["/api/surveyTheme/t1", "/api/surveys/themes/t1"],
    ["/api/survey/clone/s1", "/api/surveys/clone/s1"],
    ["/api/testimonial/collections/create", "/api/surveys/testimonials/collections/create"],
    ["/api/team/invite", "/api/teams/invite"],
    ["/api/mobilenotification/voip", "/api/mobile-notifications/voip"],
  ])("%s → %s", (from, to) => {
    expect(currentApiPath(from)).toBe(to);
  });

  test.each([
    "/api/contacts/abc",
    "/api/surveys/s1",
    "/api/teams",
    "/api/wa/webhook",
    "/api/wa/endpoint/o1/f1",
    "/api/wa/redirect/x",
    "/api/public/survey/s1",
    "/api/instagram/webhook",
    "/api/external/v1/o1/contact",
    "/api/contact-x",
    "/apix/contact",
  ])("leaves %s alone", (url) => {
    expect(currentApiPath(url)).toBe(url);
  });

  test("a new URL is never itself an old one, so rewriting is one step", () => {
    for (const { to } of LEGACY_API_PREFIXES) {
      const sample = to.replace(/:[A-Za-z]+/g, "x");
      expect(currentApiPath(sample)).toBe(sample);
    }
  });

  test("a longer old prefix comes before any shorter one it starts with", () => {
    LEGACY_API_PREFIXES.forEach(({ from }, i) => {
      for (const earlier of LEGACY_API_PREFIXES.slice(0, i)) {
        expect(from.startsWith(`${earlier.from}/`), `${from} is shadowed by ${earlier.from}`).toBe(
          false,
        );
      }
    });
  });
});

describe("rewriteLegacyUrl", () => {
  test("rewrites the raw request URL and passes others through", () => {
    expect(rewriteLegacyUrl({ url: "/api/campaign/c1?x=1" })).toBe("/api/campaigns/c1?x=1");
    expect(rewriteLegacyUrl({ url: "/api/campaigns/c1" })).toBe("/api/campaigns/c1");
    expect(rewriteLegacyUrl({})).toBe("/");
  });
});

describe("served through Fastify's rewriteUrl", () => {
  test("an old URL reaches the route at the new one, with params and query", async () => {
    const { default: Fastify } = await import("fastify");
    const server = Fastify({ rewriteUrl: rewriteLegacyUrl });
    server.get("/api/surveys/:surveyId/questions/:id", async (request) => ({
      url: request.url,
      originalUrl: request.originalUrl,
      params: request.params,
      query: request.query,
    }));
    server.get("/api/automation/rules", async () => ({ ok: true }));

    const old = await server.inject({ method: "GET", url: "/api/question/s1/q2?lang=en" });
    expect(old.statusCode).toBe(200);
    expect(old.json()).toEqual({
      url: "/api/surveys/s1/questions/q2?lang=en",
      originalUrl: "/api/question/s1/q2?lang=en",
      params: { surveyId: "s1", id: "q2" },
      query: { lang: "en" },
    });
    expect((await server.inject("/api/wa/automated-reply/rule")).statusCode).toBe(200);
    expect((await server.inject("/api/automation/rules")).statusCode).toBe(200);
    await server.close();
  });
});
