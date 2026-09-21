import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./prisma.js", () => ({ default: { auditLog: { create: vi.fn() } } }));

import prisma from "./prisma.js";
import { REDACTED, auditLogHook, recordAuditEvent, redactAuditBody } from "./auditLog.js";

const create = prisma.auditLog.create as unknown as ReturnType<typeof vi.fn>;

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    method: "PUT",
    url: "/api/user/update-active-status/u-1",
    routeOptions: { url: "/api/user/update-active-status/:userId" },
    userId: "u-1",
    user: { orgId: "org-1" },
    body: {},
    log: { error: vi.fn() },
    ...overrides,
  } as any;
}

beforeEach(() => create.mockReset());

describe("redactAuditBody", () => {
  test("withholds a password but keeps the rest of the body", () => {
    expect(redactAuditBody({ password: "hunter2", isActive: false })).toEqual({
      password: REDACTED,
      isActive: false,
    });
  });

  test.each([
    "password",
    "newPassword",
    "old_password",
    "clientSecret",
    "accessToken",
    "refresh_token",
    "apiKey",
    "API-KEY",
    "privateKey",
    "authorization",
    "credentials",
    "key",
    "otp",
    "pin",
  ])("withholds a field named %s", (name) => {
    expect(redactAuditBody({ [name]: "value" })).toEqual({ [name]: REDACTED });
  });

  test.each([
    "name",
    "keyword",
    "shipping",
    "code",
    "phone",
    "email",
    "monkeyBusiness",
    "promptTokens",
    "max_tokens",
  ])("keeps a harmless field named %s", (name) => {
    expect(redactAuditBody({ [name]: "value" })).toEqual({ [name]: "value" });
  });

  test("withholds credentials at any depth, including inside arrays", () => {
    expect(
      redactAuditBody({
        integration: { name: "Zoho", auth: { clientSecret: "s", region: "in" } },
        webhooks: [{ url: "https://x", token: "t" }],
      }),
    ).toEqual({
      integration: { name: "Zoho", auth: { clientSecret: REDACTED, region: "in" } },
      webhooks: [{ url: "https://x", token: REDACTED }],
    });
  });

  test("withholds a whole object stored under a sensitive name", () => {
    expect(redactAuditBody({ credentials: { user: "a", pass: "b" } })).toEqual({
      credentials: REDACTED,
    });
  });

  test("records an oversized body as its field names only", () => {
    const body = {
      contacts: Array.from({ length: 500 }, (_, i) => ({ phone: `9100000${i}` })),
      groupId: "g",
    };

    expect(redactAuditBody(body)).toEqual({
      note: "Too large to record",
      fields: ["contacts", "groupId"],
    });
  });

  test("does not keep uploaded file contents", () => {
    expect(redactAuditBody({ file: Buffer.from("abc"), name: "a.csv" })).toEqual({
      file: "[binary]",
      name: "a.csv",
    });
  });

  test("stores an empty object for a request with no body", () => {
    expect(redactAuditBody(undefined)).toEqual({});
    expect(redactAuditBody(null)).toEqual({});
  });
});

describe("auditLogHook", () => {
  test("never writes the password from an account deletion to the log", async () => {
    await auditLogHook(makeRequest({ body: { password: "hunter2", isActive: false } }), {} as any);

    const saved = create.mock.calls[0][0].data;
    expect(saved.body).toEqual({ password: REDACTED, isActive: false });
    expect(JSON.stringify(saved)).not.toContain("hunter2");
  });

  test("still skips GET requests", async () => {
    await auditLogHook(makeRequest({ method: "GET" }), {} as any);

    expect(create).not.toHaveBeenCalled();
  });
});

describe("recordAuditEvent", () => {
  test("redacts the details a handler passes in as well", async () => {
    await recordAuditEvent(makeRequest(), "Channel added", { phone: "+1", accessToken: "EAAG" });

    expect(create.mock.calls[0][0].data.body).toEqual({ phone: "+1", accessToken: REDACTED });
  });
});
