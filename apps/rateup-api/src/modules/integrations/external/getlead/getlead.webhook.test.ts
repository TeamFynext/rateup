import crypto from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const integration = {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  upsert: vi.fn(),
};

vi.mock("../../../../utils/prisma.js", () => ({
  default: { integration },
}));

const {
  buildGetLeadWebhookUrl,
  describeGetLeadInbound,
  hashGetLeadToken,
  issueGetLeadWebhook,
  markGetLeadDeliveryReceived,
  resolveGetLeadWebhookOrg,
  verifyGetLeadSignature,
} = await import("./getlead.webhook.js");

const ORG = "org-1";
const SECRET = "s3cr3t";

function row(inbound: Record<string, unknown> | undefined, active = true) {
  return {
    id: "int-1",
    orgId: ORG,
    name: "getlead",
    active,
    credential: { apiKey: "ik_live", ...(inbound && { inbound }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  integration.upsert.mockResolvedValue({});
});

describe("issueGetLeadWebhook", () => {
  test("stores the token and its hash, so the URL can be shown again", async () => {
    integration.findUnique.mockResolvedValue(row(undefined));

    const issued = await issueGetLeadWebhook(ORG);

    const token = issued.url.split("/").pop() ?? "";
    expect(token.length).toBeGreaterThan(20);

    const stored = integration.upsert.mock.calls[0][0].update.credential.inbound;
    expect(stored.token).toBe(token);
    expect(stored.tokenHash).toBe(hashGetLeadToken(token));
  });

  test("keeps the API key when issuing, rather than replacing the credential", async () => {
    integration.findUnique.mockResolvedValue(row(undefined));

    await issueGetLeadWebhook(ORG);

    expect(integration.upsert.mock.calls[0][0].update.credential.apiKey).toBe("ik_live");
  });

  test("mints a secret distinct from the token", async () => {
    integration.findUnique.mockResolvedValue(row(undefined));

    const issued = await issueGetLeadWebhook(ORG);

    expect(issued.secret).not.toBe(issued.url.split("/").pop());
    expect(issued.secret.length).toBeGreaterThan(20);
  });

  test("hands back the same URL a later read would build", async () => {
    integration.findUnique.mockResolvedValue(row(undefined));

    const issued = await issueGetLeadWebhook(ORG);
    const stored = integration.upsert.mock.calls[0][0].update.credential.inbound;

    expect(describeGetLeadInbound(stored)).toMatchObject({
      url: issued.url,
      secret: issued.secret,
    });
  });
});

describe("resolveGetLeadWebhookOrg", () => {
  test("looks the org up by the hash, never by the token", async () => {
    integration.findFirst.mockResolvedValue(
      row({ tokenHash: hashGetLeadToken("tok"), secret: SECRET }),
    );

    const resolved = await resolveGetLeadWebhookOrg("tok");

    expect(resolved?.orgId).toBe(ORG);
    const where = integration.findFirst.mock.calls[0][0].where;
    expect(where.credential.equals).toBe(hashGetLeadToken("tok"));
    expect(where.credential.equals).not.toBe("tok");
    expect(where.active).toBe(true);
  });

  test("returns null for an empty token without querying", async () => {
    expect(await resolveGetLeadWebhookOrg("")).toBeNull();
    expect(integration.findFirst).not.toHaveBeenCalled();
  });

  test("returns null when no org matches", async () => {
    integration.findFirst.mockResolvedValue(null);
    expect(await resolveGetLeadWebhookOrg("nope")).toBeNull();
  });

  test("returns null when the row has no secret to verify against", async () => {
    integration.findFirst.mockResolvedValue(row({ tokenHash: hashGetLeadToken("tok") }));
    expect(await resolveGetLeadWebhookOrg("tok")).toBeNull();
  });
});

describe("verifyGetLeadSignature", () => {
  const body = '{"event":"lead.status_changed"}';
  const hex = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  const base64 = crypto.createHmac("sha256", SECRET).update(body).digest("base64");

  test("accepts a hex digest", () => {
    expect(verifyGetLeadSignature(body, SECRET, { "x-getlead-signature": hex }).ok).toBe(true);
  });

  test("accepts a base64 digest, since GetLead does not say which it sends", () => {
    // A sha256 digest is 32 bytes, so its base64 form always ends in "=" padding.
    // Stripping an "algo=" prefix by splitting on "=" used to eat it.
    expect(base64.endsWith("=")).toBe(true);
    expect(verifyGetLeadSignature(body, SECRET, { "x-signature": base64 }).ok).toBe(true);
  });

  test("accepts a sha256=<digest> prefix", () => {
    expect(
      verifyGetLeadSignature(body, SECRET, { "x-hub-signature-256": `sha256=${hex}` }).ok,
    ).toBe(true);
  });

  test("rejects a digest made with a different secret", () => {
    const wrong = crypto.createHmac("sha256", "other").update(body).digest("hex");
    expect(verifyGetLeadSignature(body, SECRET, { "x-signature": wrong })).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  test("rejects a body that was altered after signing", () => {
    expect(verifyGetLeadSignature(`${body} `, SECRET, { "x-signature": hex }).ok).toBe(false);
  });

  test("rejects an unsigned delivery rather than trusting it", () => {
    expect(verifyGetLeadSignature(body, SECRET, {})).toEqual({
      ok: false,
      reason: "missing_signature",
    });
  });

  test("survives a signature of the wrong length without throwing", () => {
    // timingSafeEqual throws on mismatched lengths; the length check is what
    // keeps a malformed header from becoming a 500.
    expect(() => verifyGetLeadSignature(body, SECRET, { "x-signature": "short" })).not.toThrow();
    expect(verifyGetLeadSignature(body, SECRET, { "x-signature": "short" }).ok).toBe(false);
  });
});

describe("markGetLeadDeliveryReceived", () => {
  test("records the timestamp while keeping the token hash and secret", async () => {
    const inbound = {
      token: "tok",
      tokenHash: "hash",
      secret: SECRET,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    integration.findUnique.mockResolvedValue(row(inbound));

    await markGetLeadDeliveryReceived(ORG, inbound);

    const stored = integration.upsert.mock.calls[0][0].update.credential.inbound;
    expect(stored.lastReceivedAt).toBeDefined();
    expect(stored.tokenHash).toBe("hash");
    expect(stored.secret).toBe(SECRET);
  });

  test("swallows a write failure, since the delivery itself already succeeded", async () => {
    integration.findUnique.mockRejectedValue(new Error("db down"));
    await expect(
      markGetLeadDeliveryReceived(ORG, {
        token: "tok",
        tokenHash: "h",
        secret: SECRET,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("buildGetLeadWebhookUrl", () => {
  test("puts the token on the public receiver path", () => {
    expect(buildGetLeadWebhookUrl("tok")).toContain("/api/public/integrations/getlead/hooks/tok");
  });
});
