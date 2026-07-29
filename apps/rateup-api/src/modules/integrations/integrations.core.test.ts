import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-client-secret";
  process.env.FRONTEND_URL = "https://app.test.example";
});

vi.mock("../../utils/prisma.js", () => ({
  default: {
    integration: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    survey: { updateMany: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../apiAccessToken/apiAccessToken.service.js", () => ({
  generateApiKey: vi.fn(async () => ({ key: "plain-api-key", hash: "bcrypt-hash" })),
}));

vi.mock("axios", () => ({ default: { delete: vi.fn(), get: vi.fn(), post: vi.fn() } }));

vi.mock("../whatsapp/wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("../whatsapp/settings/wa_settings.service.js", () => ({
  getWaSettings: vi.fn(),
  getWaSettingsById: vi.fn(),
}));
vi.mock("./shopify/shopify.service.js", () => ({ sendWhatsAppTemplateToCustomer: vi.fn() }));
vi.mock("./integration_axios.js", () => ({ callWaAmeliaApi: vi.fn() }));
vi.mock("googleapis", () => ({
  google: {
    auth: { OAuth2: class {} },
    options: vi.fn(),
  },
}));

import axios from "axios";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { generateApiKey } from "../apiAccessToken/apiAccessToken.service.js";
import { callMetaApi } from "../whatsapp/wa_axios.js";
import { getWaSettings } from "../whatsapp/settings/wa_settings.service.js";
import { sendWhatsAppTemplateToCustomer } from "./shopify/shopify.service.js";
import {
  createIntegration,
  deleteIntegrationByName,
  deleteWaPaymentConfiguration,
  deleteZapierTriggerHooks,
  getAllIntegrations,
  getAllIntegrationsByOrgId,
  getIntegrationByName,
  getIntegrationByPetPoojaRestaurantId,
  updateIntegrationByName,
} from "./integrations.service.js";
import { updateIntgrationSchema } from "./integrations.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  integration: Record<string, Mock>;
  survey: Record<string, Mock>;
};

const ORG = "11111111-1111-1111-1111-111111111111";
const OTHER_ORG = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.integration.findMany.mockResolvedValue([]);
  db.integration.findFirst.mockResolvedValue(null);
  db.integration.findUnique.mockResolvedValue(null);
  db.integration.create.mockResolvedValue({ id: "int-1" });
  db.integration.update.mockResolvedValue({ id: "int-1" });
  db.integration.upsert.mockResolvedValue({ id: "int-1" });
  db.integration.delete.mockResolvedValue({ id: "int-1" });
  db.survey.updateMany.mockResolvedValue({ count: 0 });
  (generateApiKey as unknown as Mock).mockResolvedValue({
    key: "plain-api-key",
    hash: "bcrypt-hash",
  });
  (callMetaApi as unknown as Mock).mockResolvedValue({ status: 200, data: { data: [] } });
  (getWaSettings as unknown as Mock).mockResolvedValue({ wabaId: "waba-1", accessToken: "tok" });
  (sendWhatsAppTemplateToCustomer as unknown as Mock).mockResolvedValue({ status: true });
  (axios.delete as unknown as Mock).mockResolvedValue({ status: 200 });
});

// ===========================================================================
// Tenant scoping of the readers
// ===========================================================================

describe("the integration readers", () => {
  test("the per-org list is scoped to the org", async () => {
    await getAllIntegrationsByOrgId(ORG);

    expect(db.integration.findMany).toHaveBeenCalledWith({ where: { orgId: ORG } });
  });

  test("by-name is keyed on the org and name compound unique", async () => {
    await getIntegrationByName(ORG, "zapier");

    expect(db.integration.findUnique.mock.calls[0][0].where).toEqual({
      orgid_integration_name_unique: { orgId: ORG, name: "zapier" },
    });
  });

  // NOTE: no where, no select. Every integration of every organisation, with
  // the whole credential JSON — OAuth refresh tokens, Shopify session tokens,
  // Zoho tokens, the bcrypt hash of each org's Zapier key.
  test("getAllIntegrations reads every row of every org with no filter", async () => {
    await getAllIntegrations();

    expect(db.integration.findMany).toHaveBeenCalledWith();
    expect(db.integration.findMany.mock.calls[0][0]).toBeUndefined();
  });

  test("getAllIntegrations returns the credential column untouched", async () => {
    db.integration.findMany.mockResolvedValueOnce([
      { id: "a", orgId: ORG, name: "googlesheet", credential: { refreshToken: "1//secret" } },
      {
        id: "b",
        orgId: OTHER_ORG,
        name: "shopify",
        credential: { session: { accessToken: "shpat_x" } },
      },
    ]);

    const rows = (await getAllIntegrations()) as unknown as any[];

    expect(rows[0].credential).toEqual({ refreshToken: "1//secret" });
    expect(rows[1].credential.session.accessToken).toBe("shpat_x");
  });

  // NOTE: the PetPooja lookup matches on a restaurant id inside the credential
  // JSON across every org's rows. That is intentional for a webhook with no
  // org context, but it means one org's restaurant id selects a row regardless
  // of ownership.
  test("the petpooja lookup searches every org's credentials", async () => {
    await getIntegrationByPetPoojaRestaurantId("rest-1");

    expect(db.integration.findFirst.mock.calls[0][0]).toEqual({
      where: { credential: { path: ["restaurantId"], equals: "rest-1" } },
    });
  });
});

// ===========================================================================
// createIntegration
// ===========================================================================

describe("createIntegration", () => {
  test("stores the name, credential and org", async () => {
    await createIntegration({ name: "amelia", credential: { apiKey: "k" } } as never, ORG);

    expect(db.integration.create).toHaveBeenCalledWith({
      data: { name: "amelia", credential: { apiKey: "k" }, orgId: ORG },
    });
  });

  // NOTE: Integration.orgId is nullable (prisma/schema.prisma:1861), so an
  // omitted org creates an unowned row rather than failing. The Shopify OAuth
  // callback relies on this.
  test("creates an org-less row when no org is given", async () => {
    await createIntegration({ name: "shopify", credential: {} } as never);

    expect(db.integration.create.mock.calls[0][0].data.orgId).toBeUndefined();
  });

  test("mints an API key for zapier and stores only its hash", async () => {
    const res = await createIntegration({ name: "zapier", credential: {} } as never, ORG);

    expect(db.integration.create.mock.calls[0][0].data.credential).toEqual({
      accessToken: "bcrypt-hash",
    });
    expect(res.apikey).toBe("plain-api-key");
  });

  // NOTE: the plaintext key is returned to the caller once and never stored —
  // the right shape. But the caller-supplied credential is merged first, so
  // anything else the caller sent is kept alongside it.
  test("keeps the rest of a caller-supplied zapier credential", async () => {
    await createIntegration(
      { name: "zapier", credential: { accessToken: "attacker-chosen", note: "x" } } as never,
      ORG,
    );

    const cred = db.integration.create.mock.calls[0][0].data.credential;
    expect(cred.accessToken).toBe("bcrypt-hash");
    expect(cred.note).toBe("x");
  });

  test("mutates the caller's input object in place", async () => {
    const input = { name: "zapier", credential: {} } as never;

    await createIntegration(input, ORG);

    expect((input as any).credential.accessToken).toBe("bcrypt-hash");
  });

  test("no other integration name gets a key", async () => {
    await createIntegration({ name: "googlesheet", credential: {} } as never, ORG);

    expect(generateApiKey).not.toHaveBeenCalled();
  });

  // NOTE: (orgId, name) is unique, so re-connecting an app rejects with P2002.
  // The handler turns that into a bare 500 "Something went wrong".
  test("propagates the duplicate-name constraint failure", async () => {
    db.integration.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    await expect(
      createIntegration({ name: "zapier", credential: {} } as never, ORG),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

// ===========================================================================
// updateIntegrationByName — the update payload
// ===========================================================================

describe("updateIntegrationByName", () => {
  test("selects the row by the caller's org and the name", async () => {
    await updateIntegrationByName(ORG, "amelia", { credential: { a: 1 } });

    expect(db.integration.update.mock.calls[0][0].where).toEqual({
      orgid_integration_name_unique: { orgId: ORG, name: "amelia" },
    });
  });

  test("writes the credential through", async () => {
    await updateIntegrationByName(ORG, "amelia", { credential: { a: 1 } });

    expect(db.integration.update.mock.calls[0][0].data).toEqual({ credential: { a: 1 } });
  });

  // NOTE: `const { ...rest } = data` is a copy, not a destructure — nothing is
  // removed. Every key the body schema accepts is forwarded into the Prisma
  // update, including orgId.
  test("forwards a caller-supplied orgId into the update", async () => {
    await updateIntegrationByName(ORG, "googlesheet", {
      credential: { a: 1 },
      orgId: OTHER_ORG,
    });

    expect(db.integration.update.mock.calls[0][0].data.orgId).toBe(OTHER_ORG);
    // The row is selected by the caller's org but re-parented to another one.
    expect(db.integration.update.mock.calls[0][0].where).toEqual({
      orgid_integration_name_unique: { orgId: ORG, name: "googlesheet" },
    });
  });

  test("the body schema explicitly accepts an orgId", () => {
    const parsed = updateIntgrationSchema.safeParse({ orgId: OTHER_ORG });

    expect(parsed.success).toBe(true);
    expect((parsed as any).data.orgId).toBe(OTHER_ORG);
  });

  // NOTE: updateKey is a control flag, not a column. It is read for the zapier
  // branch and then forwarded into the update data, where Prisma rejects it as
  // an unknown argument — so the documented way to rotate a Zapier key cannot
  // succeed.
  test("forwards the updateKey control flag into the update data", async () => {
    await updateIntegrationByName(ORG, "zapier", { credential: {}, updateKey: true });

    expect(db.integration.update.mock.calls[0][0].data).toHaveProperty("updateKey", true);
  });

  test("still rotates the key before sending the doomed update", async () => {
    const res = await updateIntegrationByName(ORG, "zapier", {
      credential: { accessToken: "old" },
      updateKey: true,
    });

    expect(generateApiKey).toHaveBeenCalledOnce();
    expect(db.integration.update.mock.calls[0][0].data.credential.accessToken).toBe("bcrypt-hash");
    expect(res.apikey).toBe("plain-api-key");
  });

  test("does not rotate when updateKey is absent", async () => {
    await updateIntegrationByName(ORG, "zapier", { credential: { accessToken: "old" } });

    expect(generateApiKey).not.toHaveBeenCalled();
  });

  // NOTE: the zapier branch writes into data.credential without checking it
  // exists, so updateKey with no credential throws before Prisma is reached.
  test("throws when updateKey is set with no credential", async () => {
    await expect(updateIntegrationByName(ORG, "zapier", { updateKey: true })).rejects.toThrow(
      TypeError,
    );
  });

  test("only the exact zapier name triggers rotation", async () => {
    await updateIntegrationByName(ORG, "Zapier", { credential: {}, updateKey: true });

    expect(generateApiKey).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// deleteIntegrationByName
// ===========================================================================

describe("deleteIntegrationByName", () => {
  test("is scoped to the org and name", async () => {
    await deleteIntegrationByName("amelia", ORG);

    expect(db.integration.delete.mock.calls[0][0].where).toEqual({
      orgid_integration_name_unique: { name: "amelia", orgId: ORG },
    });
  });

  test("propagates a missing-row failure rather than answering quietly", async () => {
    db.integration.delete.mockRejectedValueOnce(
      Object.assign(new Error("Record to delete does not exist"), { code: "P2025" }),
    );

    await expect(deleteIntegrationByName("amelia", ORG)).rejects.toMatchObject({ code: "P2025" });
  });
});

// ===========================================================================
// deleteZapierTriggerHooks — the outbound request
// ===========================================================================

describe("deleteZapierTriggerHooks", () => {
  const integration = (subs: any[]) => ({
    id: "int-1",
    orgId: ORG,
    name: "zapier",
    credential: { accessToken: "hash", triggerSubscriptions: subs },
  });

  // NOTE: the hook URL is taken from the request body and handed straight to
  // axios.delete. No allowlist, no scheme check, and no comparison against the
  // subscriptions actually stored for the org.
  test("issues a DELETE to whatever URL the caller supplied", async () => {
    db.integration.findUnique.mockResolvedValue(
      integration([{ hookUrl: "https://hooks.zapier.com/1", active: true }]),
    );

    await deleteZapierTriggerHooks(
      { hookUrl: "http://169.254.169.254/latest/meta-data/", active: true } as never,
      ORG,
    );

    expect(axios.delete).toHaveBeenCalledWith("http://169.254.169.254/latest/meta-data/");
  });

  test("skips the outbound call when the subscription is inactive", async () => {
    db.integration.findUnique.mockResolvedValue(integration([]));

    await deleteZapierTriggerHooks({ hookUrl: "https://evil.test/x", active: false } as never, ORG);

    expect(axios.delete).not.toHaveBeenCalled();
  });

  test("removes the matching subscription from the stored credential", async () => {
    db.integration.findUnique.mockResolvedValue(
      integration([
        { hookUrl: "https://hooks.zapier.com/1", active: true },
        { hookUrl: "https://hooks.zapier.com/2", active: true },
      ]),
    );

    await deleteZapierTriggerHooks(
      { hookUrl: "https://hooks.zapier.com/1", active: true } as never,
      ORG,
    );

    const written = db.integration.update.mock.calls[0][0].data.credential;
    expect(written.triggerSubscriptions).toEqual([
      { hookUrl: "https://hooks.zapier.com/2", active: true },
    ]);
  });

  // NOTE: the outbound DELETE fires before the org's own subscriptions are
  // read, so the request goes out even when the URL belongs to nobody.
  test("calls out before it looks at what the org actually subscribed to", async () => {
    const order: string[] = [];
    (axios.delete as unknown as Mock).mockImplementationOnce(async () => {
      order.push("http");
      return { status: 200 };
    });
    db.integration.findUnique.mockImplementationOnce(async () => {
      order.push("db");
      return integration([]);
    });

    await deleteZapierTriggerHooks({ hookUrl: "https://evil.test/x", active: true } as never, ORG);

    expect(order).toEqual(["http", "db"]);
  });

  test("throws when the org has no zapier integration at all", async () => {
    db.integration.findUnique.mockResolvedValue(null);

    await expect(
      deleteZapierTriggerHooks({ hookUrl: "https://x.test", active: false } as never, ORG),
    ).rejects.toThrow(TypeError);
  });
});

// ===========================================================================
// deleteWaPaymentConfiguration
// ===========================================================================

describe("deleteWaPaymentConfiguration", () => {
  beforeEach(() => {
    db.integration.findUnique.mockResolvedValue({
      id: "int-1",
      orgId: ORG,
      name: "waPayment",
      credential: [],
    });
  });

  test("asks Meta to delete the named configuration", async () => {
    await deleteWaPaymentConfiguration(ORG, "cfg-1");

    expect(callMetaApi).toHaveBeenCalledWith("/waba-1/payment_configuration", "DELETE", "tok", {
      configuration_name: "cfg-1",
    });
  });

  // NOTE: the function resolves the same way whether Meta accepted the delete
  // or refused it — the handler answers 204 either way.
  test("resolves silently when Meta refuses", async () => {
    (callMetaApi as unknown as Mock).mockResolvedValueOnce({
      status: 400,
      data: { error: { message: "cannot delete" } },
    });

    await expect(deleteWaPaymentConfiguration(ORG, "cfg-1")).resolves.toBeUndefined();
    expect(log.error).not.toHaveBeenCalled();
  });

  test("refuses when the org has no payment configuration stored", async () => {
    db.integration.findUnique.mockResolvedValue(null);

    await expect(deleteWaPaymentConfiguration(ORG, "cfg-1")).rejects.toThrow(
      "No Configurations Found",
    );
    expect(callMetaApi).not.toHaveBeenCalled();
  });
});
