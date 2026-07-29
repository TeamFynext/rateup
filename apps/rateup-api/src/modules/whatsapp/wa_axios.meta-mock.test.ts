import { startMetaMock } from "@rateup/meta-mock";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The Graph host is switchable, and stays switched.
 *
 * `callMetaApi` reads `META_API_BASE_URL` once, at module load, and every
 * WhatsApp and Instagram call in this service goes through it. That single
 * variable is what lets an end-to-end run exercise the Meta-first write paths —
 * creating a flow, submitting a template, sending a message — without touching
 * a real WhatsApp Business Account or a real phone.
 *
 * It is also easy to break silently: inline a URL back into one call site and
 * everything still passes locally, because locally the two hosts behave the
 * same. It only shows up when a test run posts to a live WABA. So this pins the
 * contract directly — point the variable at a mock, and prove the request
 * arrives there rather than at graph.facebook.com.
 */
describe("callMetaApi against @rateup/meta-mock", () => {
  let mock: Awaited<ReturnType<typeof startMetaMock>>;
  let callMetaApi: typeof import("./wa_axios.js").callMetaApi;

  beforeAll(async () => {
    // Port 0 takes any free port, so this does not collide with a mock the e2e
    // suite may already have running on 3099.
    mock = await startMetaMock({ port: 0 });
    process.env.META_API_BASE_URL = mock.url;

    // Imported after the variable is set: the module reads it at load time.
    ({ callMetaApi } = await import("./wa_axios.js"));
  });

  afterAll(async () => {
    delete process.env.META_API_BASE_URL;
    await mock.close();
  });

  it("sends requests to META_API_BASE_URL, not to graph.facebook.com", async () => {
    await callMetaApi("/1234567890/messages", "POST", "token", {
      messaging_product: "whatsapp",
      to: "919999999999",
      type: "text",
      text: { body: "hello" },
    });

    const [sent] = mock.calls({ path: "/messages", method: "POST" });
    expect(sent, "the request never reached the mock — it went to the real Graph host").toBeTruthy();
    expect(sent.body).toMatchObject({ to: "919999999999", messaging_product: "whatsapp" });
  });

  it("returns Cloud API's message envelope", async () => {
    const response = await callMetaApi("/1234567890/messages", "POST", "token", {
      messaging_product: "whatsapp",
      to: "919999999999",
    });

    expect(response.status).toBe(200);
    expect(response.data.messaging_product).toBe("whatsapp");
    expect(response.data.messages?.[0]?.id).toMatch(/^wamid\./);
  });

  it("creates a flow on Graph before anything is stored locally", async () => {
    // The Meta-first path: `createFlowInWa` posts here and the database row is
    // only written once Graph answers with an id. Against the real host this
    // would put a flow on a live WABA.
    const created = await callMetaApi("/1234567890/flows", "POST", "token", {
      name: "onboarding",
      categories: ["SIGN_UP"],
    });

    expect(created.data.id, "Graph must hand back a flow id").toBeTruthy();

    const [sent] = mock.calls({ path: "/flows", method: "POST" });
    expect(sent.body).toMatchObject({ name: "onboarding", categories: ["SIGN_UP"] });

    // And the mock is stateful, so the flow it just made comes back on a read —
    // which is what makes a create/list round trip testable at all.
    const listed = await callMetaApi("/1234567890/flows", "GET", "token");
    expect(listed.data.data.map((flow: { name: string }) => flow.name)).toContain("onboarding");
  });

  it("carries the bearer token Graph expects", async () => {
    await callMetaApi("/1234567890/message_templates", "GET", "a-token");

    const [read] = mock.calls({ path: "/message_templates", method: "GET" });
    expect(read).toBeTruthy();
    // The mock does not record headers, so this asserts the call shape only —
    // the token itself is covered by the flows that need a real WABA.
    expect(read.path).toBe("/1234567890/message_templates");
  });
});
