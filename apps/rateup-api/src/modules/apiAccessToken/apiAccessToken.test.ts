import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../generated/prisma/client.js", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      meta: any;
      constructor(code: string, meta?: any) {
        super(code);
        this.code = code;
        this.meta = meta;
      }
    },
  },
  Role: { SUPER_ADMIN: "SUPER_ADMIN", ADMIN: "ADMIN", MEMBER: "MEMBER" },
}));

vi.mock("../../utils/prisma.js", () => ({
  default: {
    apiAccessToken: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../org/org.services.js", () => ({ getOrgById: vi.fn() }));
vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/checkRoleHandler.js", () => ({
  checkRoleHandler: vi.fn((roles) => Object.assign(vi.fn(), { roles })),
}));

import bcrypt from "bcrypt";
import { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { getOrgById } from "../org/org.services.js";
import { checkSession } from "../../utils/checkSession.js";
import { generateRandomAlphaId } from "../../utils/misc/random.utils.js";
import {
  ApiKeyAlreadyExistsError,
  createApiKey,
  deleteApiKey,
  generateApiKey,
  getApiKeyCreatedAt,
  regenerateApiKey,
  verifyApiAccessToken,
} from "./apiAccessToken.service.js";
import {
  createApiAccessTokenHandler,
  deleteApiAccessTokenHandler,
  getApiAccessTokenCreatedAtHandler,
  regenerateApiAccessTokenHandler,
} from "./apiAccessToken.controller.js";
import { verifyApiAccessTokenHook } from "./apiAccessToken.auth.js";
import { apiAccessTokenRoutes } from "./apiAccessToken.route.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { apiAccessToken: Record<string, Mock> };
const orgById = getOrgById as unknown as Mock;

const FakeKnownError = (Prisma as any).PrismaClientKnownRequestError as new (
  code: string,
  meta?: any,
) => Error & { code: string; meta: any };

const ORG = "11111111-1111-1111-1111-111111111111";
const OTHER_ORG = "22222222-2222-2222-2222-222222222222";
const CREATED = new Date("2026-01-01T00:00:00.000Z");

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function hookReq(over: Record<string, unknown> = {}) {
  return {
    params: {},
    query: {},
    headers: {},
    url: "/api/external/v1/x",
    ...over,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.apiAccessToken.create.mockResolvedValue({ orgId: ORG, accessToken: "h", createdAt: CREATED });
  db.apiAccessToken.delete.mockResolvedValue({ orgId: ORG, accessToken: "h", createdAt: CREATED });
  db.apiAccessToken.findUnique.mockResolvedValue({ orgId: ORG, createdAt: CREATED });
  db.apiAccessToken.upsert.mockResolvedValue({ orgId: ORG, accessToken: "h", createdAt: CREATED });
  orgById.mockResolvedValue({ id: ORG, name: "Acme" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// How the credential is generated
// ===========================================================================

describe("generateApiKey", () => {
  test("the key does not come from Math.random", async () => {
    const spy = vi.spyOn(Math, "random");

    await generateApiKey();

    expect(spy).not.toHaveBeenCalled();
  });

  test("the shared alpha-id helper does not either", () => {
    const spy = vi.spyOn(Math, "random");

    // Also mints the Zoho webhook secret (zoho.controller.ts:116).
    const id = generateRandomAlphaId(128);

    expect(spy).not.toHaveBeenCalled();
    expect(id).toMatch(/^[A-Za-z]{128}$/);
  });

  test("two keys minted in a row differ", async () => {
    const a = await generateApiKey();
    const b = await generateApiKey();

    expect(a.key).not.toBe(b.key);
  });

  test("generateApiKey returns the plaintext beside its hash", async () => {
    const { key, hash } = await generateApiKey();

    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).not.toBe(key);
    expect(hash.startsWith("$2")).toBe(true);
  });

  test("the key is short enough that bcrypt hashes all of it", async () => {
    const { key, hash } = await generateApiKey();

    expect(Buffer.byteLength(key)).toBeLessThanOrEqual(72);
    // Change any single character and the comparison fails — which was not true
    // of the last 56 characters of the old key.
    const tampered = key.slice(0, -1) + (key.endsWith("A") ? "B" : "A");
    expect(await bcrypt.compare(tampered, hash)).toBe(false);
  });

  test("the hash is bcrypt at five rounds", async () => {
    const { hash } = await generateApiKey();

    expect(hash.split("$")[2]).toBe("05");
  });

  test("bcrypt itself still truncates at 72 bytes", async () => {
    const key = "A".repeat(72) + "B".repeat(56);
    const differentTail = "A".repeat(72) + "C".repeat(56);

    const hash = await bcrypt.hash(key, 5);

    expect(await bcrypt.compare(differentTail, hash)).toBe(true);
  });

  test("a difference within the first 72 characters is still detected", async () => {
    const key = "A".repeat(72) + "B".repeat(56);
    const differentHead = "Z" + "A".repeat(71) + "B".repeat(56);

    const hash = await bcrypt.hash(key, 5);

    expect(await bcrypt.compare(differentHead, hash)).toBe(false);
  });
});

// ===========================================================================
// Storage and verification
// ===========================================================================

describe("createApiKey", () => {
  test("stores the hash, never the plaintext, and returns the plaintext", async () => {
    const key = await createApiKey(ORG);

    const data = db.apiAccessToken.create.mock.calls[0][0].data;
    expect(data.orgId).toBe(ORG);
    expect(data.accessToken).not.toBe(key);
    expect(data.accessToken.startsWith("$2")).toBe(true);
    expect(await bcrypt.compare(key, data.accessToken)).toBe(true);
  });

  test("does not check whether the org already has a key", async () => {
    await createApiKey(ORG);

    expect(db.apiAccessToken.findUnique).not.toHaveBeenCalled();
  });

  test("a second key for the same org is refused in terms the handler can use", async () => {
    db.apiAccessToken.create.mockRejectedValueOnce(
      new FakeKnownError("P2002", { target: ["orgId"] }),
    );

    await expect(createApiKey(ORG)).rejects.toBeInstanceOf(ApiKeyAlreadyExistsError);
  });

  test("any other write failure is rethrown untouched", async () => {
    db.apiAccessToken.create.mockRejectedValueOnce(new Error("connection lost"));

    await expect(createApiKey(ORG)).rejects.toThrow("connection lost");
  });
});

describe("verifyApiAccessToken", () => {
  test("compares the presented key against the stored hash for that org", async () => {
    const { key, hash } = await generateApiKey();
    db.apiAccessToken.findUnique.mockResolvedValueOnce({ orgId: ORG, accessToken: hash });

    await expect(verifyApiAccessToken(ORG, key)).resolves.toBe(true);
    expect(db.apiAccessToken.findUnique).toHaveBeenCalledWith({ where: { orgId: ORG } });
  });

  test("a key belonging to another org does not verify", async () => {
    const { hash } = await generateApiKey();
    const other = await generateApiKey();
    db.apiAccessToken.findUnique.mockResolvedValueOnce({ orgId: ORG, accessToken: hash });

    await expect(verifyApiAccessToken(ORG, other.key)).resolves.toBe(false);
  });

  test("an org with no key verifies false rather than throwing", async () => {
    db.apiAccessToken.findUnique.mockResolvedValueOnce(null);

    await expect(verifyApiAccessToken(ORG, "anything")).resolves.toBe(false);
  });

  test("the lookup is keyed on the org the caller named", async () => {
    db.apiAccessToken.findUnique.mockResolvedValueOnce(null);

    await verifyApiAccessToken(OTHER_ORG, "k");

    expect(db.apiAccessToken.findUnique).toHaveBeenCalledWith({ where: { orgId: OTHER_ORG } });
  });

  test("every verification pays a bcrypt comparison", async () => {
    const spy = vi.spyOn(bcrypt, "compare");
    const { key, hash } = await generateApiKey();
    db.apiAccessToken.findUnique.mockResolvedValue({ orgId: ORG, accessToken: hash });

    await verifyApiAccessToken(ORG, key);
    await verifyApiAccessToken(ORG, key);

    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("deleteApiKey and getApiKeyCreatedAt", () => {
  test("delete is keyed on the org alone", async () => {
    await deleteApiKey(ORG);

    expect(db.apiAccessToken.delete).toHaveBeenCalledWith({ where: { orgId: ORG } });
  });

  test("deleting when there is no key rejects", async () => {
    db.apiAccessToken.delete.mockRejectedValueOnce(new FakeKnownError("P2025"));

    await expect(deleteApiKey(ORG)).rejects.toMatchObject({ code: "P2025" });
  });

  test("the created-at read selects only the timestamp", async () => {
    await expect(getApiKeyCreatedAt(ORG)).resolves.toBe(CREATED);
    expect(db.apiAccessToken.findUnique).toHaveBeenCalledWith({
      where: { orgId: ORG },
      select: { createdAt: true },
    });
  });

  test("an org with no key reads back undefined, not null", async () => {
    db.apiAccessToken.findUnique.mockResolvedValueOnce(null);

    await expect(getApiKeyCreatedAt(ORG)).resolves.toBeUndefined();
  });
});

describe("regenerateApiKey", () => {
  test("replaces the row in one statement", async () => {
    await regenerateApiKey(ORG);

    expect(db.apiAccessToken.delete).not.toHaveBeenCalled();
    expect(db.apiAccessToken.create).not.toHaveBeenCalled();
    expect(db.apiAccessToken.upsert).toHaveBeenCalledOnce();
    expect(db.apiAccessToken.upsert.mock.calls[0][0].where).toEqual({ orgId: ORG });
  });

  test("a failed write leaves the existing key in place", async () => {
    db.apiAccessToken.upsert.mockRejectedValueOnce(new Error("connection lost"));

    await expect(regenerateApiKey(ORG)).rejects.toThrow("connection lost");
    expect(db.apiAccessToken.delete).not.toHaveBeenCalled();
  });

  // The delete-then-create ordering also made regenerate unusable for an org
  // that had no key yet: the delete raised P2025 against the missing row.
  test("an org with no existing key can regenerate", async () => {
    const key = await regenerateApiKey(ORG);

    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(db.apiAccessToken.upsert.mock.calls[0][0].create.orgId).toBe(ORG);
  });

  test("stores the hash of the key it returns, never the key", async () => {
    const key = await regenerateApiKey(ORG);

    const { create, update } = db.apiAccessToken.upsert.mock.calls[0][0];
    expect(create.accessToken).not.toBe(key);
    expect(await bcrypt.compare(key, create.accessToken)).toBe(true);
    expect(await bcrypt.compare(key, update.accessToken)).toBe(true);
  });

  test("the regenerated key is different from the one it replaced", async () => {
    const first = await createApiKey(ORG);
    const second = await regenerateApiKey(ORG);

    expect(second).not.toBe(first);
  });
});

// ===========================================================================
// The preHandler that authenticates an API key
// ===========================================================================

describe("verifyApiAccessTokenHook", () => {
  async function runHook(over: Record<string, unknown> = {}, valid = true) {
    const { key, hash } = await generateApiKey();
    db.apiAccessToken.findUnique.mockResolvedValue({
      orgId: ORG,
      accessToken: valid ? hash : (await generateApiKey()).hash,
    });
    const request = hookReq({
      params: { orgId: ORG },
      headers: { authorization: `Bearer ${key}` },
      ...over,
    });
    const rep = reply();
    await verifyApiAccessTokenHook(request, rep);
    return { request, rep, key };
  }

  test("a valid key puts the org on the request and sends nothing", async () => {
    const { request, rep } = await runHook();

    expect(request.user).toEqual({ orgId: ORG, role: "SUPER_ADMIN" });
    expect(rep.send).not.toHaveBeenCalled();
  });

  test("every API-key caller is granted SUPER_ADMIN", async () => {
    // NOTE: the role is a constant. Nothing reads the caller's actual
    // membership, and there is no way to mint a lesser-privileged key.
    const { request } = await runHook();

    expect(request.user.role).toBe("SUPER_ADMIN");
  });

  test("the identity it builds has no userId", async () => {
    // NOTE: the source comment says services fetch the user from the request.
    // Any service reading request.user.userId gets undefined here.
    const { request } = await runHook();

    expect(request.user).not.toHaveProperty("userId");
    expect(request.user.userId).toBeUndefined();
  });

  test("falls back to the query string when there is no orgId path param", async () => {
    const { key, hash } = await generateApiKey();
    db.apiAccessToken.findUnique.mockResolvedValue({ orgId: ORG, accessToken: hash });
    const request = hookReq({
      params: {},
      query: { orgId: ORG },
      headers: { authorization: `Bearer ${key}` },
    });
    const rep = reply();

    await verifyApiAccessTokenHook(request, rep);

    expect(request.user).toEqual({ orgId: ORG, role: "SUPER_ADMIN" });
  });

  test("no orgId anywhere answers 404", async () => {
    const rep = reply();

    await verifyApiAccessTokenHook(hookReq(), rep);

    expect(rep.code).toHaveBeenCalledWith(404);
    expect(rep.send).toHaveBeenCalledWith({ message: "Not found" });
  });

  test("an org that does not exist answers 404 and stops", async () => {
    orgById.mockResolvedValueOnce(null);
    const rep = reply();

    await verifyApiAccessTokenHook(hookReq({ params: { orgId: OTHER_ORG } }), rep);

    expect(rep.code).toHaveBeenCalledWith(404);
    expect(rep.code).toHaveBeenCalledTimes(1);
    expect(db.apiAccessToken.findUnique).not.toHaveBeenCalled();
  });

  test("a key for one org does not authenticate against another", async () => {
    const { hash } = await generateApiKey();
    const attacker = await generateApiKey();
    db.apiAccessToken.findUnique.mockResolvedValue({ orgId: OTHER_ORG, accessToken: hash });
    const request = hookReq({
      params: { orgId: OTHER_ORG },
      headers: { authorization: `Bearer ${attacker.key}` },
    });
    const rep = reply();

    await verifyApiAccessTokenHook(request, rep);

    expect(rep.code).toHaveBeenCalledWith(401);
    expect(request.user).toBeUndefined();
  });

  test("the token is verified against the org the caller named", async () => {
    await runHook({ params: { orgId: OTHER_ORG } }, false);

    expect(db.apiAccessToken.findUnique).toHaveBeenCalledWith({ where: { orgId: OTHER_ORG } });
  });

  test("a lookup failure on the org replies 404 and stops", async () => {
    orgById.mockRejectedValueOnce(new Error("invalid uuid"));
    const { key, hash } = await generateApiKey();
    db.apiAccessToken.findUnique.mockResolvedValue({ orgId: ORG, accessToken: hash });
    const request = hookReq({
      params: { orgId: "not-a-uuid" },
      headers: { authorization: `Bearer ${key}` },
    });
    const rep = reply();

    await verifyApiAccessTokenHook(request, rep);

    expect(rep.code).toHaveBeenCalledTimes(1);
    expect(rep.code).toHaveBeenCalledWith(404);
    // The key comparison used to run against an org that could not be loaded,
    // and request.user was set on a request already refused.
    expect(db.apiAccessToken.findUnique).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  test("one refused request produces exactly one reply", async () => {
    orgById.mockRejectedValueOnce(new Error("invalid uuid"));
    const rep = reply();

    await verifyApiAccessTokenHook(hookReq({ params: { orgId: "not-a-uuid" } }), rep);

    expect(rep.send).toHaveBeenCalledTimes(1);
    expect(rep.code.mock.calls.map((c: unknown[]) => c[0])).toEqual([404]);
  });

  // Fixed as part of the strict-mode migration: a missing `authorization` header
  // used to throw `.startsWith` on `undefined` into the outer catch, answering a
  // generic 401 instead of the specific "no bearer token" 400 given to every other
  // malformed-header case. Now guarded the same way as the non-bearer case below.
  test("a missing Authorization header answers the same 400 as a non-bearer header", async () => {
    const rep = reply();

    await verifyApiAccessTokenHook(hookReq({ params: { orgId: ORG } }), rep);

    expect(rep.code).toHaveBeenCalledWith(400);
    expect(rep.send).toHaveBeenCalledWith({
      message: "Invalid request",
      error: "No bearer token found in headers",
    });
  });

  test("a non-bearer Authorization header answers 400", async () => {
    const rep = reply();

    await verifyApiAccessTokenHook(
      hookReq({ params: { orgId: ORG }, headers: { authorization: "Basic abc" } }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(400);
  });

  test("an empty bearer token answers 401 without a database lookup", async () => {
    const rep = reply();

    await verifyApiAccessTokenHook(
      hookReq({ params: { orgId: ORG }, headers: { authorization: "Bearer " } }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(401);
    expect(db.apiAccessToken.findUnique).not.toHaveBeenCalled();
  });

  test("an invalid key answers 401 and sets no identity", async () => {
    const { request, rep } = await runHook({}, false);

    expect(rep.code).toHaveBeenCalledWith(401);
    expect(request.user).toBeUndefined();
  });

  test("no refusal writes the request headers to the log", async () => {
    const { key } = await generateApiKey();
    db.apiAccessToken.findUnique.mockResolvedValue({ orgId: ORG, accessToken: "$2b$05$notahash" });

    for (const headers of [
      { authorization: "Basic secret" },
      { authorization: "Bearer " },
      { authorization: `Bearer ${key}`, cookie: "sAccessToken=abc" },
      {},
    ]) {
      await verifyApiAccessTokenHook(hookReq({ params: { orgId: ORG }, headers }), reply());
    }
    await verifyApiAccessTokenHook(hookReq({ headers: { authorization: "Bearer x" } }), reply());
    orgById.mockResolvedValueOnce(null);
    await verifyApiAccessTokenHook(hookReq({ params: { orgId: OTHER_ORG } }), reply());

    const logged = JSON.stringify([
      ...(log.error as unknown as Mock).mock.calls,
      ...(log.warn as unknown as Mock).mock.calls,
    ]);
    expect(logged).not.toContain(key);
    expect(logged).not.toContain("Basic secret");
    expect(logged).not.toContain("sAccessToken");
  });

  test("but the org id and the reason are still logged", async () => {
    await verifyApiAccessTokenHook(
      hookReq({ params: { orgId: ORG }, headers: { authorization: "Basic secret" } }),
      reply(),
    );

    expect(log.error).toHaveBeenCalledWith({ orgId: ORG }, "No bearer token found in headers");
  });

  test("a refused request never reaches the token comparison", async () => {
    const rep = reply();

    await verifyApiAccessTokenHook(
      hookReq({ params: { orgId: ORG }, headers: { authorization: "Basic abc" } }),
      rep,
    );

    expect(db.apiAccessToken.findUnique).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// The management handlers
// ===========================================================================

describe("controllers", () => {
  function req() {
    return { user: { userId: "u-1", orgId: ORG, role: "MEMBER", email: "a@b.c" } } as any;
  }

  test("create answers with the plaintext key for the session org", async () => {
    const rep = reply();

    await createApiAccessTokenHandler(req(), rep);

    const body = rep.send.mock.calls[0][0];
    expect(body.apiKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(db.apiAccessToken.create.mock.calls[0][0].data.orgId).toBe(ORG);
  });

  test("create takes the org from the session, never from a parameter", async () => {
    const rep = reply();

    await createApiAccessTokenHandler(req(), rep);

    expect(db.apiAccessToken.create.mock.calls[0][0].data.orgId).toBe(ORG);
    expect(db.apiAccessToken.create.mock.calls[0][0].data.orgId).not.toBe(OTHER_ORG);
  });

  test("create answers 201", async () => {
    const rep = reply();

    await createApiAccessTokenHandler(req(), rep);

    expect(rep.code).toHaveBeenCalledWith(201);
  });

  test("a duplicate create answers 409 and names the remedy", async () => {
    db.apiAccessToken.create.mockRejectedValueOnce(
      new FakeKnownError("P2002", { target: ["orgId"] }),
    );
    const rep = reply();

    await createApiAccessTokenHandler(req(), rep);

    expect(rep.code).toHaveBeenCalledWith(409);
    expect(rep.send.mock.calls[0][0].error).toContain("regenerate");
  });

  test("delete answers 204", async () => {
    const rep = reply();

    await deleteApiAccessTokenHandler(req(), rep);

    expect(rep.code).toHaveBeenCalledWith(204);
    expect(rep.send).toHaveBeenCalledOnce();
    expect(db.apiAccessToken.delete).toHaveBeenCalledWith({ where: { orgId: ORG } });
  });

  test("the created-at read reports both the timestamp and that a key exists", async () => {
    const rep = reply();

    await getApiAccessTokenCreatedAtHandler(req(), rep);

    expect(rep.send).toHaveBeenCalledWith({ exists: true, createdAt: CREATED });
  });

  test("no key reads back an explicit absence", async () => {
    db.apiAccessToken.findUnique.mockResolvedValueOnce(null);
    const rep = reply();

    await getApiAccessTokenCreatedAtHandler(req(), rep);

    expect(rep.send).toHaveBeenCalledWith({ exists: false, createdAt: null });
  });

  test("regenerate answers with a fresh plaintext key", async () => {
    const rep = reply();

    await regenerateApiAccessTokenHandler(req(), rep);

    expect(rep.send.mock.calls[0][0].apiKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(db.apiAccessToken.upsert).toHaveBeenCalledTimes(1);
  });

  test("a failed create escapes the handler rather than answering", async () => {
    db.apiAccessToken.create.mockRejectedValueOnce(new Error("connection lost"));
    const rep = reply();

    await expect(createApiAccessTokenHandler(req(), rep)).rejects.toThrow("connection lost");
    expect(rep.send).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("routes", () => {
  function fakeServer() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };
    return { srv, routes, hooks };
  }

  test("registers four routes behind a single session check", async () => {
    const { srv, routes, hooks } = fakeServer();

    await apiAccessTokenRoutes(srv);

    expect(hooks).toEqual([{ name: "preHandler", fn: checkSession }]);
    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "POST /",
      "DELETE /",
      "POST /regenerate",
      "GET /",
    ]);
  });

  test("minting, deleting and regenerating require SUPER_ADMIN", async () => {
    const { srv, routes } = fakeServer();

    await apiAccessTokenRoutes(srv);

    for (const url of ["POST /", "DELETE /", "POST /regenerate"]) {
      const r = routes.find((x) => `${x.method} ${x.url}` === url);
      expect((r.opts.preHandler[0] as any).roles).toEqual(["SUPER_ADMIN"]);
    }
  });

  // The read returns only whether a key exists and when it was minted, never
  // the key itself.
  test("the created-at read stays open to any member", async () => {
    const { srv, routes } = fakeServer();

    await apiAccessTokenRoutes(srv);

    const read = routes.find((r) => r.method === "GET");
    expect(read.opts).toBe(getApiAccessTokenCreatedAtHandler);
    expect(read.handler).toBeUndefined();
  });

  test("the three gated routes carry their handler in the third argument", async () => {
    const { srv, routes } = fakeServer();

    await apiAccessTokenRoutes(srv);

    expect(routes.map((r) => r.handler)).toEqual([
      createApiAccessTokenHandler,
      deleteApiAccessTokenHandler,
      regenerateApiAccessTokenHandler,
      undefined,
    ]);
  });

  test("the session check is the only hook", async () => {
    const { srv, hooks } = fakeServer();

    await apiAccessTokenRoutes(srv);

    expect(hooks).toHaveLength(1);
    expect(hooks[0].name).toBe("preHandler");
  });
});
