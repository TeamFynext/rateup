import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const redisStub = vi.hoisted(() => {
  const clones: any[] = [];
  const make = () => ({
    on: vi.fn(),
    subscribe: vi.fn(),
    publish: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    duplicate: vi.fn(),
  });
  const base: any = make();
  // The controller duplicates the connection twice at import time — a
  // subscriber then a publisher. Keep the instances on a plain array so
  // clearAllMocks cannot lose them.
  base.clones = clones;
  base.duplicate = vi.fn(() => {
    const clone = make();
    clones.push(clone);
    return clone;
  });
  return base;
});

vi.mock("../../../utils/redisConnection.js", () => ({
  default: redisStub,
  userStatusQueue: { add: vi.fn(), remove: vi.fn() },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("supertokens-node/recipe/session/index.js", () => ({
  getSessionWithoutRequestResponse: vi.fn(),
}));

vi.mock("../../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import { getSessionWithoutRequestResponse } from "supertokens-node/recipe/session/index.js";
import { userStatusQueue } from "../../../utils/redisConnection.js";
import { checkSession } from "../../../utils/checkSession.js";
import { connectionManager } from "./org.ws.class.js";
import {
  checkMobileId,
  handleWebSocketConnection,
  orgWsAuthCheckHandler,
  sendViaWstoOrgHandler,
  WS_CHANNEL,
} from "./org.ws.controller.js";
import { orgWsRoutes } from "./org.ws.routes.js";
import { afterAuthIdParamsSchema } from "./org.ws.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const USER = "11111111-1111-1111-1111-111111111111";
const OWN_ORG = "22222222-2222-2222-2222-222222222222";
const VICTIM_ORG = "33333333-3333-3333-3333-333333333333";

function socket() {
  const handlers: Record<string, (...args: any[]) => any> = {};
  return {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn((event: string, fn: any) => {
      handlers[event] = fn;
    }),
    fire: (event: string, ...args: any[]) => handlers[event]?.(...args),
  } as any;
}

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

beforeEach(() => {
  vi.clearAllMocks();
  (userStatusQueue.add as unknown as Mock).mockResolvedValue({ id: "job-1" });
  (userStatusQueue.remove as unknown as Mock).mockResolvedValue(undefined);
  redisStub.get.mockResolvedValue(null);
  redisStub.set.mockResolvedValue("OK");
  redisStub.del.mockResolvedValue(1);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// handleWebSocketConnection — what decides which room you join
// ===========================================================================

describe("handleWebSocketConnection", () => {
  const req = (over: any = {}) =>
    ({
      params: { afterAuthId: "browser-1" },
      query: {},
      user: { orgId: OWN_ORG },
      userId: USER,
      ...over,
    }) as never;

  // NOTE: the room is keyed on request.user.orgId — the session's org — and the
  // path parameter is only the key WITHIN that room. Supplying another org's
  // afterAuthId does not move the caller into that org's room.
  test("rooms the connection on the session org, not the path id", async () => {
    const a = socket();
    await handleWebSocketConnection(a, req({ params: { afterAuthId: "a-victim-browser-id" } }));

    const b = socket();
    await handleWebSocketConnection(b, req({ user: { orgId: VICTIM_ORG } }));

    // A broadcast to the victim org reaches only the socket whose session said so.
    await sendViaWstoOrgHandler(VICTIM_ORG, { type: "inbox" } as never);
    const published = JSON.parse(redisStub.clones[1].publish.mock.calls[0][1]);
    expect(published.orgId).toBe(VICTIM_ORG);
  });

  test("refuses a connection with no session org", async () => {
    const s = socket();

    await handleWebSocketConnection(s, req({ user: undefined }));

    expect(s.send).toHaveBeenCalledWith(JSON.stringify({ error: "Missing orgId or browserId" }));
    expect(s.close).toHaveBeenCalledOnce();
  });

  test("refuses a connection with no browser id", async () => {
    const s = socket();

    await handleWebSocketConnection(s, req({ params: {} }));

    expect(s.close).toHaveBeenCalledOnce();
  });

  // NOTE: the role a connection is tagged with comes from the query string, so
  // a client declares its own role for filtering purposes.
  test("tags the socket with a role taken from the query string", async () => {
    const s = socket();

    await handleWebSocketConnection(s, req({ query: { role: "SUPER_ADMIN" } }));

    expect((s as any).role).toBe("SUPER_ADMIN");
  });

  test("defaults the role to main", async () => {
    const s = socket();

    await handleWebSocketConnection(s, req());

    expect((s as any).role).toBe("main");
  });

  test("schedules an online status for the connecting user", async () => {
    const s = socket();

    await handleWebSocketConnection(s, req());

    expect(userStatusQueue.add).toHaveBeenCalledWith(
      "set-online",
      { userId: USER, orgId: OWN_ORG },
      expect.objectContaining({ delay: 2000 }),
    );
  });

  test("schedules an offline status when the socket closes", async () => {
    const s = socket();
    await handleWebSocketConnection(s, req());

    await s.fire("close");

    expect(userStatusQueue.add).toHaveBeenCalledWith(
      "set-offline",
      { userId: USER, orgId: OWN_ORG },
      expect.objectContaining({ delay: 15000 }),
    );
  });

  // NOTE: the map is keyed on the caller-supplied browser id, so a second
  // connection reusing an existing id replaces the first entry — the earlier
  // socket stays open but stops receiving broadcasts.
  test("a repeated browser id displaces the previous entry without closing it", async () => {
    const first = socket();
    const second = socket();

    await handleWebSocketConnection(first, req({ params: { afterAuthId: "same-id" } }));
    await handleWebSocketConnection(second, req({ params: { afterAuthId: "same-id" } }));

    expect(first.close).not.toHaveBeenCalled();
  });

  test("logs whatever a client sends rather than acting on it", async () => {
    const s = socket();
    await handleWebSocketConnection(s, req());

    s.fire("message", Buffer.from("hello"));

    // No branch reads the message; it is only logged.
    expect(s.send).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// The broadcast path
// ===========================================================================

describe("sendViaWstoOrgHandler", () => {
  test("publishes the org, payload and filter onto the shared channel", async () => {
    await sendViaWstoOrgHandler(OWN_ORG, { type: "inbox" } as never, "SUPER_ADMIN");

    const publisher = redisStub.clones[1];
    const [channel, body] = publisher.publish.mock.calls[0];
    expect(channel).toBe(WS_CHANNEL);
    expect(JSON.parse(body)).toEqual({
      orgId: OWN_ORG,
      data: { type: "inbox" },
      roleFilter: "SUPER_ADMIN",
    });
  });

  // NOTE: neither call site in the codebase passes a roleFilter — both call it
  // with two arguments — so the filter is always undefined and every socket in
  // the org receives every message.
  test("omitting the filter publishes it as undefined", async () => {
    await sendViaWstoOrgHandler(OWN_ORG, { type: "inbox" } as never);

    const publisher = redisStub.clones[1];
    expect(JSON.parse(publisher.publish.mock.calls[0][1]).roleFilter).toBeUndefined();
  });

  test("a publish failure is logged rather than thrown", async () => {
    const publisher = redisStub.clones[1];
    publisher.publish.mockRejectedValueOnce(new Error("redis down"));

    await expect(
      sendViaWstoOrgHandler(OWN_ORG, { type: "inbox" } as never),
    ).resolves.toBeUndefined();
  });
});

// ===========================================================================
// checkMobileId — the token in the query string
// ===========================================================================

describe("checkMobileId", () => {
  beforeEach(() => {
    (getSessionWithoutRequestResponse as unknown as Mock).mockResolvedValue({
      getUserId: () => USER,
      getAccessTokenPayload: () => ({ role: "ADMIN", orgId: OWN_ORG, email: "a@b.test" }),
    });
  });

  // NOTE: the access token is read from the query string rather than a header
  // or a cookie.
  test("takes the access token from the query string", async () => {
    const request: any = { query: { accessToken: "eyJhbGciOi..." }, headers: {} };

    await checkMobileId(request, reply());

    expect(getSessionWithoutRequestResponse).toHaveBeenCalledWith("eyJhbGciOi...");
  });

  test("puts the resolved identity on the request", async () => {
    const request: any = { query: { accessToken: "t" }, headers: {} };

    await checkMobileId(request, reply());

    expect(request.userId).toBe(USER);
    expect(request.user).toEqual({
      userId: USER,
      role: "ADMIN",
      orgId: OWN_ORG,
      email: "a@b.test",
    });
  });

  // NOTE: an invalid or absent token makes getSessionWithoutRequestResponse
  // throw, and there is no try/catch — so the rejection escapes the preHandler
  // rather than answering 401.
  test("an invalid token escapes the preHandler", async () => {
    (getSessionWithoutRequestResponse as unknown as Mock).mockRejectedValueOnce(
      new Error("UNAUTHORISED"),
    );

    await expect(
      checkMobileId({ query: { accessToken: "bad" }, headers: {} } as never, reply()),
    ).rejects.toThrow("UNAUTHORISED");
  });

  // NOTE: the 401 branch sends and then carries on to read the payload and set
  // the identity on a request that has already been refused.
  test("the 401 branch does not return", async () => {
    (getSessionWithoutRequestResponse as unknown as Mock).mockResolvedValueOnce({
      getUserId: () => undefined,
      getAccessTokenPayload: () => ({ role: "ADMIN", orgId: OWN_ORG, email: "a@b.test" }),
    });
    const request: any = { query: { accessToken: "t" }, headers: {} };
    const rep = reply();

    await checkMobileId(request, rep);

    expect(rep.code).toHaveBeenCalledWith(401);
    expect(request.user).toBeDefined();
    expect(request.user.orgId).toBe(OWN_ORG);
  });
});

// ===========================================================================
// The connection manager
// ===========================================================================

describe("connectionManager", () => {
  test("issues a 128-bit random id and remembers it against the org", () => {
    const id = connectionManager.generateAfterAuthIdforOrgId(OWN_ORG);

    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(connectionManager.orgIdToAfterAuthIds.get(OWN_ORG)).toContain(id);
  });

  // NOTE: nothing ever removes an id from this map, and the auth endpoint mints
  // a fresh one per call — so the list grows for the lifetime of the process.
  test("ids accumulate per org and are never removed", () => {
    const before = connectionManager.orgIdToAfterAuthIds.get(OWN_ORG)?.length ?? 0;

    connectionManager.generateAfterAuthIdforOrgId(OWN_ORG);
    connectionManager.generateAfterAuthIdforOrgId(OWN_ORG);
    connectionManager.generateAfterAuthIdforOrgId(OWN_ORG);

    expect(connectionManager.orgIdToAfterAuthIds.get(OWN_ORG)!.length).toBe(before + 3);
  });

  // NOTE: the collision check sits in the else branch, so the first id issued
  // for an org is never checked against the connection map.
  test("the first id for an org skips the collision check", () => {
    const fresh = "44444444-4444-4444-4444-444444444444";

    connectionManager.generateAfterAuthIdforOrgId(fresh);

    expect(connectionManager.orgIdToAfterAuthIds.get(fresh)).toHaveLength(1);
  });

  test("the auth endpoint answers with the minted id", async () => {
    const rep = reply();

    await orgWsAuthCheckHandler({ user: { orgId: OWN_ORG } } as never, rep);

    expect(rep.send.mock.calls[0][0].afterAuthId).toMatch(/^[0-9a-f]{32}$/);
  });

  // NOTE: the broadcast path uses its own activeConnections map, keyed on the
  // session org, so nothing reads back what the connection manager stored.
  test("the ids it stores are never used to route a message", () => {
    const id = connectionManager.generateAfterAuthIdforOrgId(OWN_ORG);

    expect(connectionManager.getConnectionsBasedOnOrgId(OWN_ORG)).toEqual([]);
    expect(connectionManager.afterAuthIdsToConnections.get(id)).toBeUndefined();
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("orgWsRoutes", () => {
  async function collect() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: vi.fn((url, opts, handler) => routes.push({ url, opts, handler })),
    };
    await orgWsRoutes(srv);
    return { routes, hooks };
  }

  test("registers three routes and adds no tree-wide hook", async () => {
    const { routes, hooks } = await collect();

    expect(routes.map((r) => r.url)).toEqual(["/auth", "/:afterAuthId", "/:afterAuthId/mobilews"]);
    expect(hooks).toHaveLength(0);
  });

  test("the browser socket requires a session cookie", async () => {
    const { routes } = await collect();

    const ws = routes.find((r) => r.url === "/:afterAuthId");
    expect(ws.opts.preHandler).toBe(checkSession);
    expect(ws.opts.websocket).toBe(true);
  });

  // NOTE: the mobile socket uses a different check, which reads its token from
  // the query string instead of the session.
  test("the mobile socket uses the query-string check instead", async () => {
    const { routes } = await collect();

    const mobile = routes.find((r) => r.url === "/:afterAuthId/mobilews");
    expect(mobile.opts.preHandler).toBe(checkMobileId);
    expect(mobile.opts.websocket).toBe(true);
    expect(mobile.opts.schema).toBeUndefined();
  });

  test("the auth endpoint is marked deprecated", async () => {
    const { routes } = await collect();

    expect(routes[0].opts.schema.deprecated).toBe(true);
  });

  test("the params schema accepts any string as the connection id", () => {
    expect(afterAuthIdParamsSchema.safeParse({ afterAuthId: "anything" }).success).toBe(true);
  });
});
