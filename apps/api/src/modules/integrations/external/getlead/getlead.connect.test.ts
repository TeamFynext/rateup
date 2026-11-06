import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const integration = {
  findUnique: vi.fn(),
  upsert: vi.fn(),
};

const pipelineStage = { count: vi.fn() };

vi.mock("../../../../utils/prisma.js", () => ({
  default: { integration, pipelineStage },
}));

const getGetLeadMeta = vi.fn();
vi.mock("./getlead.client.js", () => ({
  createGetLeadAxios: vi.fn(() => ({})),
  getGetLeadMeta: (...args: unknown[]) => getGetLeadMeta(...args),
}));

const { connectGetLead, connectGetLeadFromForm, getCachedGetLeadMeta } =
  await import("./getlead.connect.js");
const { mergeGetLeadCredential } = await import("./getlead.credential.js");
const { saveGetLeadSettings } = await import("./getlead.settings.js");
const { IntegrationConnectError } = await import("../../shared/oauthConnectError.js");

const META = {
  sources: [
    { id: "01SRC_DIRECT", name: "Direct" },
    { id: "01SRC_WEBSITE", name: "Website" },
  ],
  statuses: [],
  purposes: [],
  custom_fields: [],
};

function httpError(status: number) {
  const error = new AxiosError("Request failed");
  error.response = {
    status,
    statusText: "",
    data: { error: { code: "INVALID_API_KEY", message: "Invalid API key provided." } },
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

beforeEach(() => {
  vi.clearAllMocks();
  integration.upsert.mockResolvedValue({});
});

describe("mergeGetLeadCredential", () => {
  test("keeps fields the patch does not mention", async () => {
    integration.findUnique.mockResolvedValue({
      credential: { apiKey: "ik_live", stageMappings: [{ stageId: "s1" }] },
    });

    const result = await mergeGetLeadCredential("org-1", { lastSyncAt: "2026-09-03" });

    // The whole point: updateIntegrationByName assigns the column wholesale, so
    // saving one part of the config through it would drop the API key.
    expect(result.apiKey).toBe("ik_live");
    expect(result.stageMappings).toEqual([{ stageId: "s1" }]);
    expect(result.lastSyncAt).toBe("2026-09-03");
  });

  test("a mapping save does not wipe the stored key", async () => {
    integration.findUnique.mockResolvedValue({ credential: { apiKey: "ik_live" } });

    await mergeGetLeadCredential("org-1", {
      stageMappings: [{ stageId: "s1", getleadStatusId: "st1" }],
    });

    expect(integration.upsert.mock.calls[0][0].update.credential.apiKey).toBe("ik_live");
  });

  test("creates the row when the org has never connected", async () => {
    integration.findUnique.mockResolvedValue(null);

    await mergeGetLeadCredential("org-1", { apiKey: "ik_new" });

    const call = integration.upsert.mock.calls[0][0];
    expect(call.create).toMatchObject({ orgId: "org-1", name: "getlead" });
    expect(call.create.credential.apiKey).toBe("ik_new");
  });
});

describe("connectGetLead", () => {
  test("stores the key and caches the meta the check returned", async () => {
    integration.findUnique.mockResolvedValue(null);
    getGetLeadMeta.mockResolvedValue(META);

    await connectGetLead("org-1", "ik_good");

    const credential = integration.upsert.mock.calls[0][0].create.credential;
    expect(credential.apiKey).toBe("ik_good");
    expect(credential.meta.fetchedAt).toEqual(expect.any(String));
  });

  test("rejects a bad key as a 400 and stores nothing", async () => {
    getGetLeadMeta.mockRejectedValue(httpError(401));

    await expect(connectGetLead("org-1", "ik_bad")).rejects.toBeInstanceOf(IntegrationConnectError);
    await expect(connectGetLead("org-1", "ik_bad")).rejects.toMatchObject({ statusCode: 400 });
    expect(integration.upsert).not.toHaveBeenCalled();
  });

  test("an unreachable GetLead is a 502, not a bad key", async () => {
    getGetLeadMeta.mockRejectedValue(httpError(500));

    await expect(connectGetLead("org-1", "ik_good")).rejects.toMatchObject({ statusCode: 502 });
  });

  test("surfaces a rate limit as 429 so the client can back off", async () => {
    getGetLeadMeta.mockRejectedValue(httpError(429));

    await expect(connectGetLead("org-1", "ik_good")).rejects.toMatchObject({ statusCode: 429 });
  });
});

describe("saveGetLeadSettings — tenant isolation", () => {
  const mapping = [{ stageId: "11111111-1111-1111-1111-111111111111", getleadStatusId: "01S" }];

  test("rejects a mapping naming a column the org does not own", async () => {
    integration.findUnique.mockResolvedValue({ id: "int-1", orgId: "org-1", credential: {} });
    pipelineStage.count.mockResolvedValue(0);

    await expect(
      saveGetLeadSettings("org-1", { stageMappings: mapping } as never),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(integration.upsert).not.toHaveBeenCalled();
  });

  test("saves a mapping of the org's own columns", async () => {
    integration.findUnique.mockResolvedValue({ id: "int-1", orgId: "org-1", credential: {} });
    pipelineStage.count.mockResolvedValue(1);

    await saveGetLeadSettings("org-1", { stageMappings: mapping } as never);

    expect(integration.upsert).toHaveBeenCalled();
    // Scoped by org, not merely by stage id.
    expect(pipelineStage.count.mock.calls[0][0].where.pipeline).toEqual({
      orgId: "org-1",
      type: "LEADS",
    });
  });
});

describe("connectGetLead — the inbound webhook", () => {
  test("seeds a webhook URL on first connect, so the settings card has one to show", async () => {
    integration.findUnique.mockResolvedValue(null);
    getGetLeadMeta.mockResolvedValue(META);

    await connectGetLead("org-1", "ik_key");

    const { inbound } = integration.upsert.mock.calls[0][0].update.credential;
    expect(inbound.token).toBeTruthy();
    expect(inbound.secret).toBeTruthy();
  });

  test("keeps a working webhook when the key is replaced", async () => {
    const inbound = { token: "tok", tokenHash: "hash", secret: "sec", createdAt: "2026-01-01" };
    integration.findUnique.mockResolvedValue({
      id: "int-1",
      orgId: "org-1",
      credential: { apiKey: "ik_old", inbound },
    });
    getGetLeadMeta.mockResolvedValue(META);

    await connectGetLead("org-1", "ik_new");

    // Re-pasting a key must not silently break a workflow that is delivering.
    expect(integration.upsert.mock.calls[0][0].update.credential.inbound).toEqual(inbound);
  });

  test("repairs an inbound that has no token, since it cannot build a URL", async () => {
    integration.findUnique.mockResolvedValue({
      id: "int-1",
      orgId: "org-1",
      credential: { apiKey: "ik_old", inbound: { tokenHash: "hash", secret: "sec" } },
    });
    getGetLeadMeta.mockResolvedValue(META);

    await connectGetLead("org-1", "ik_new");

    expect(integration.upsert.mock.calls[0][0].update.credential.inbound.token).toBeTruthy();
  });
});

describe("getCachedGetLeadMeta", () => {
  test("serves fresh cache without calling GetLead", async () => {
    integration.findUnique.mockResolvedValue({
      credential: { apiKey: "ik_live", meta: { ...META, fetchedAt: new Date().toISOString() } },
    });

    await getCachedGetLeadMeta("org-1");

    expect(getGetLeadMeta).not.toHaveBeenCalled();
  });

  test("refetches once the cache is a day old", async () => {
    const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    integration.findUnique.mockResolvedValue({
      credential: { apiKey: "ik_live", meta: { ...META, fetchedAt: stale } },
    });
    getGetLeadMeta.mockResolvedValue(META);

    await getCachedGetLeadMeta("org-1");

    expect(getGetLeadMeta).toHaveBeenCalled();
  });

  test("refresh bypasses a fresh cache", async () => {
    integration.findUnique.mockResolvedValue({
      credential: { apiKey: "ik_live", meta: { ...META, fetchedAt: new Date().toISOString() } },
    });
    getGetLeadMeta.mockResolvedValue(META);

    await getCachedGetLeadMeta("org-1", true);

    expect(getGetLeadMeta).toHaveBeenCalled();
  });

  test("falls back to stale cache when the refresh fails", async () => {
    const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    integration.findUnique.mockResolvedValue({
      credential: { apiKey: "ik_live", meta: { ...META, fetchedAt: stale } },
    });
    getGetLeadMeta.mockRejectedValue(httpError(500));

    // Stale ids still resolve, so a GetLead outage must not take the settings
    // screen down with it.
    await expect(getCachedGetLeadMeta("org-1")).resolves.toMatchObject({ fetchedAt: stale });
  });

  test("throws when the org never connected", async () => {
    integration.findUnique.mockResolvedValue(null);

    await expect(getCachedGetLeadMeta("org-1")).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("trigger subscriptions on connect", () => {
  test("seeds every trigger on, so connecting actually starts syncing", async () => {
    integration.findUnique.mockResolvedValue(null);
    getGetLeadMeta.mockResolvedValue(META);

    await connectGetLead("org-1", "ik_good");

    // Every push is gated on a subscription. Without seeding these, an org that
    // connected would see nothing sync and no error saying why.
    const { triggerSubscriptions } = integration.upsert.mock.calls[0][0].create.credential;
    expect(triggerSubscriptions).toEqual([
      { subscribed_field: "getlead_lead_create", active: true },
      { subscribed_field: "getlead_lead_update", active: true },
      { subscribed_field: "getlead_note_create", active: true },
    ]);
  });

  test("re-pasting a key does not re-enable triggers the org switched off", async () => {
    integration.findUnique.mockResolvedValue({
      credential: {
        apiKey: "ik_old",
        triggerSubscriptions: [{ subscribed_field: "getlead_lead_create", active: false }],
      },
    });
    getGetLeadMeta.mockResolvedValue(META);

    await connectGetLead("org-1", "ik_new");

    expect(integration.upsert.mock.calls[0][0].update.credential.triggerSubscriptions).toEqual([
      { subscribed_field: "getlead_lead_create", active: false },
    ]);
  });
});

describe("saveGetLeadSettings", () => {
  test("saving mappings leaves the API key untouched", async () => {
    integration.findUnique.mockResolvedValue({
      credential: { apiKey: "ik_live", meta: { ...META, fetchedAt: "x" } },
    });

    await saveGetLeadSettings("org-1", {
      stageMappings: [{ stageId: "s1", getleadStatusId: "01STATUS" }],
    });

    const saved = integration.upsert.mock.calls[0][0].update.credential;
    expect(saved.apiKey).toBe("ik_live");
    expect(saved.meta).toBeDefined();
    expect(saved.stageMappings).toEqual([{ stageId: "s1", getleadStatusId: "01STATUS" }]);
  });

  test("refuses to save for an org that never connected", async () => {
    integration.findUnique.mockResolvedValue(null);

    await expect(saveGetLeadSettings("org-1", { stageMappings: [] })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("the default source", () => {
  test('seeds Direct on connect, so leads are not filed under GetLead\'s "API"', async () => {
    integration.findUnique.mockResolvedValue(null);
    getGetLeadMeta.mockResolvedValue(META);

    await connectGetLead("org-1", "ik_good");

    expect(integration.upsert.mock.calls[0][0].create.credential.defaults).toEqual({
      sourceId: "01SRC_DIRECT",
    });
  });

  test("does not override a source the org already chose", async () => {
    integration.findUnique.mockResolvedValue({
      credential: { apiKey: "ik_old", defaults: { sourceId: "01SRC_WEBSITE" } },
    });
    getGetLeadMeta.mockResolvedValue(META);

    await connectGetLead("org-1", "ik_new");

    expect(integration.upsert.mock.calls[0][0].update.credential.defaults).toEqual({
      sourceId: "01SRC_WEBSITE",
    });
  });

  test("seeds nothing when the business has no source named Direct", async () => {
    integration.findUnique.mockResolvedValue(null);
    getGetLeadMeta.mockResolvedValue({ ...META, sources: [{ id: "01X", name: "Walk-in" }] });

    await connectGetLead("org-1", "ik_good");

    expect(integration.upsert.mock.calls[0][0].create.credential.defaults).toBeUndefined();
  });
});

// The shared `POST /integrations/getlead/connect` hands the form over as strings.
describe("connectGetLeadFromForm", () => {
  test("connects with a well-formed key", async () => {
    integration.findUnique.mockResolvedValue(null);
    getGetLeadMeta.mockResolvedValue(META);

    await connectGetLeadFromForm("org-1", { apiKey: " ik_good " });

    expect(getGetLeadMeta).toHaveBeenCalledOnce();
    expect(integration.upsert.mock.calls[0][0].create.credential.apiKey).toBe("ik_good");
  });

  test("refuses a paste that is not a GetLead key before calling GetLead", async () => {
    await expect(connectGetLeadFromForm("org-1", { apiKey: "zoho-token" })).rejects.toMatchObject({
      statusCode: 400,
      message: "A GetLead API key starts with ik_",
    });
    expect(getGetLeadMeta).not.toHaveBeenCalled();
  });

  test("refuses a form with no key", async () => {
    await expect(connectGetLeadFromForm("org-1", {})).rejects.toBeInstanceOf(
      IntegrationConnectError,
    );
  });
});
