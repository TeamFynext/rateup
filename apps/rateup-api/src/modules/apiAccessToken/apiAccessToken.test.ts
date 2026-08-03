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
    },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../org/org.services.js", () => ({ getOrgById: vi.fn() }));
vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import bcrypt from "bcrypt";
import { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { getOrgById } from "../org/org.services.js";
import { checkSession } from "../../utils/checkSession.js";
import { generateRandomAlphaId } from "../../utils/misc/random.utils.js";
import {
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
  orgById.mockResolvedValue({ id: ORG, name: "Acme" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// How the credential is generated
// ===========================================================================

describe("generateApiKey", () => {
  test("the key is drawn from Math.random, one call per character", () => {
    const spy = vi.spyOn(Math, "random");

    const key = generateRandomAlphaId(128);

    expect(key).toHaveLength(128);
    expect(spy).toHaveBeenCalledTimes(128);
  });

  test("a repeated Math.random sequence reproduces the key exactly", () => {
    // NOTE: Math.random is not a CSPRNG. Its generator state is finite and
    // recoverable from output; this test only shows the key is a pure function
    // of that stream, with no other entropy mixed in.
    const seq = Array.from({ length: 128 }, (_, i) => ((i * 7919) % 1000) / 1000);

    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => seq[i++ % seq.length]);
    const first = generateRandomAlphaId(128);

    i = 0;
    const second = generateRandomAlphaId(128);

    expect(second).toBe(first);
  });

  test("the alphabet is the 52 ascii letters and nothing else", () => {
    const key = generateRandomAlphaId(512);

    expect(key).toMatch(/^[A-Za-z]{512}$/);
  });

  test("generateApiKey returns the plaintext beside its hash", async () => {
    const { key, hash } = await generateApiKey();

    expect(key).toMatch(/^[A-Za-z]{128}$/);
    expect(hash).not.toBe(key);
    expect(hash.startsWith("$2")).toBe(true);
  });

  test("the hash is bcrypt at five rounds", async () => {
    const { hash } = await generateApiKey();

    expect(hash.split("$")[2]).toBe("05");
  });

  test("bcrypt truncates the key at 72 bytes, so the last 56 characters are never checked", async () => {
    // NOTE: bcrypt hashes at most 72 bytes of input. The key is 128 characters.
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

  test("a second key for the same org is refused by the unique constraint", async () => {
    // prisma/schema.prisma:1802 — orgId is @unique, so there is one key per org.
    db.apiAccessToken.create.mockRejectedValueOnce(
      new FakeKnownError("P2002", { target: ["orgId"] }),
    );

    await expect(createApiKey(ORG)).rejects.toMatchObject({ code: "P2002" });
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
  test("deletes before creating", async () => {
    const order: string[] = [];
    db.apiAccessToken.delete.mockImplementationOnce(async () => {
      order.push("delete");
      return {};
    });
    db.apiAccessToken.create.mockImplementationOnce(async () => {
      order.push("create");
      return {};
    });

    await regenerateApiKey(ORG);

    expect(order).toEqual(["delete", "create"]);
  });

  test("the two writes are not in a transaction, so a failed create leaves no key", async () => {
    db.apiAccessToken.create.mockRejectedValueOnce(new Error("connection lost"));

    await expect(regenerateApiKey(ORG)).rejects.toThrow("connection lost");
    // The delete already committed as its own statement; nothing rolls it back.
    expect(db.apiAccessToken.delete).toHaveBeenCalledTimes(1);
    expect(db.apiAccessToken.create).toHaveBeenCalledTimes(1);
  });

  test("an org with no existing key cannot regenerate", async () => {
    db.apiAccessToken.delete.mockRejectedValueOnce(new FakeKnownError("P2025"));

    await expect(regenerateApiKey(ORG)).rejects.toMatchObject({ code: "P2025" });
    expect(db.apiAccessToken.create).not.toHaveBeenCalled();
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

  test("a lookup failure on the org replies 404 and then keeps going", async () => {
    // NOTE: the inner catch has no return, unlike the `if (!org)` branch six
    // lines above it. Execution falls through to the token check.
    orgById.mockRejectedValueOnce(new Error("invalid uuid"));
    const { key, hash } = await generateApiKey();
    db.apiAccessToken.findUnique.mockResolvedValue({ orgId: ORG, accessToken: hash });
    const request = hookReq({
      params: { orgId: "not-a-uuid" },
      headers: { authorization: `Bearer ${key}` },
    });
    const rep = reply();

    await verifyApiAccessTokenHook(request, rep);

    expect(rep.code).toHaveBeenNthCalledWith(1, 404);
    expect(db.apiAccessToken.findUnique).toHaveBeenCalled();
    expect(request.user).toEqual({ orgId: "not-a-uuid", role: "SUPER_ADMIN" });
  });

  test("that fall-through can produce two replies for one request", async () => {
    orgById.mockRejectedValueOnce(new Error("invalid uuid"));
    const rep = reply();

    // No authorization header is given, so after the 404 fall-through the second
    // reply is now the specific 400 "no bearer token" (see the fixed test above),
    // not the generic 401 the old `.startsWith` crash used to produce.
    await verifyApiAccessTokenHook(hookReq({ params: { orgId: "not-a-uuid" } }), rep);

    expect(rep.send).toHaveBeenCalledTimes(2);
    expect(rep.code.mock.calls.map((c: unknown[]) => c[0])).toEqual([404, 400]);
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

  test("the whole request header set is written to the log on every refusal", async () => {
    // NOTE: this includes the Authorization header carrying the API key.
    const rep = reply();

    await verifyApiAccessTokenHook(
      hookReq({ params: { orgId: ORG }, headers: { authorization: "Basic secret" } }),
      rep,
    );

    expect((log.error as unknown as Mock).mock.calls[0][1]).toEqual({
      authorization: "Basic secret",
    });
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
    expect(body.apiKey).toMatch(/^[A-Za-z]{128}$/);
    expect(db.apiAccessToken.create.mock.calls[0][0].data.orgId).toBe(ORG);
  });

  test("create takes the org from the session, never from a parameter", async () => {
    const rep = reply();

    await createApiAccessTokenHandler(req(), rep);

    expect(db.apiAccessToken.create.mock.calls[0][0].data.orgId).toBe(ORG);
    expect(db.apiAccessToken.create.mock.calls[0][0].data.orgId).not.toBe(OTHER_ORG);
  });

  test("create sets no status code, so the plaintext key is a plain 200", async () => {
    const rep = reply();

    await createApiAccessTokenHandler(req(), rep);

    expect(rep.code).not.toHaveBeenCalled();
  });

  test("delete never replies at all", async () => {
    // NOTE: an async Fastify handler that resolves without sending leaves the
    // request open. Same shape as issues.txt 36.3 and 39.3.
    const rep = reply();

    await expect(deleteApiAccessTokenHandler(req(), rep)).resolves.toBeUndefined();

    expect(rep.send).not.toHaveBeenCalled();
    expect(rep.code).not.toHaveBeenCalled();
    expect(db.apiAccessToken.delete).toHaveBeenCalledWith({ where: { orgId: ORG } });
  });

  test("the created-at read answers with the timestamp", async () => {
    const rep = reply();

    await getApiAccessTokenCreatedAtHandler(req(), rep);

    expect(rep.send).toHaveBeenCalledWith({ createdAt: CREATED });
  });

  test("no key answers with an undefined timestamp rather than a 404", async () => {
    db.apiAccessToken.findUnique.mockResolvedValueOnce(null);
    const rep = reply();

    await getApiAccessTokenCreatedAtHandler(req(), rep);

    expect(rep.send).toHaveBeenCalledWith({ createdAt: undefined });
  });

  test("regenerate answers with a fresh plaintext key", async () => {
    const rep = reply();

    await regenerateApiAccessTokenHandler(req(), rep);

    expect(rep.send.mock.calls[0][0].apiKey).toMatch(/^[A-Za-z]{128}$/);
    expect(db.apiAccessToken.delete).toHaveBeenCalledTimes(1);
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

  test("no route requires a role, so any member can mint an API key", async () => {
    // NOTE: the key the mint returns authenticates as SUPER_ADMIN.
    const { srv, routes } = fakeServer();

    await apiAccessTokenRoutes(srv);

    for (const r of routes) {
      expect(r.handler).toBeUndefined();
      expect(typeof r.opts).toBe("function");
    }
  });

  test("every route is registered two-arg, with no options object at all", async () => {
    // So there is nowhere a role check, a schema or a rate limit could be
    // declared per route — only the tree-wide preHandler above.
    const { srv, routes } = fakeServer();

    await apiAccessTokenRoutes(srv);

    const handlers = [
      createApiAccessTokenHandler,
      deleteApiAccessTokenHandler,
      regenerateApiAccessTokenHandler,
      getApiAccessTokenCreatedAtHandler,
    ];
    expect(routes.map((r) => r.opts)).toEqual(handlers);
  });

  test("the session check is the only hook", async () => {
    const { srv, hooks } = fakeServer();

    await apiAccessTokenRoutes(srv);

    expect(hooks).toHaveLength(1);
    expect(hooks[0].name).toBe("preHandler");
  });
});
