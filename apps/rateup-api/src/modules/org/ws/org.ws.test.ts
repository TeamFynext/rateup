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
import { log } from "../../../utils/logger.js";
import { checkSession } from "../../../utils/checkSession.js";
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

// The controller registers its Redis subscriber at import time. Grab the
// callback now, at collection time — beforeEach's clearAllMocks drops the
// recorded call. Invoking it is how these tests observe who a broadcast
// actually reaches.
const deliver: (channel: string, message: string) => void = redisStub.clones[0].on.mock.calls.find(
  (c: any) => c[0] === "message",
)![1];

function broadcast(orgId: string, data: unknown, roleFilter?: string) {
  deliver(WS_CHANNEL, JSON.stringify({ orgId, data, roleFilter }));
}

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

  // The role used to come from the query string — the client declared its own
  // role, and the subscriber below filters deliveries on it. See issues.txt 41.5.
  test("tags the socket with the role from the session, not the query string", async () => {
    const s = socket();

    await handleWebSocketConnection(
      s,
      req({ query: { role: "SUPER_ADMIN" }, user: { orgId: OWN_ORG, role: "MEMBER" } }),
    );

    expect((s as any).role).toBe("MEMBER");
  });

  test("a role filter no longer matches a self-declared role", async () => {
    const s = socket();
    await handleWebSocketConnection(
      s,
      req({ query: { role: "SUPER_ADMIN" }, user: { orgId: OWN_ORG, role: "MEMBER" } }),
    );

    broadcast(OWN_ORG, { type: "inbox" }, "SUPER_ADMIN");

    expect(s.send).not.toHaveBeenCalled();
  });

  test("defaults the role to main when the session carries none", async () => {
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

  // The room was keyed on the caller-supplied browser id, so a second
  // connection reusing an existing id replaced the first entry: that socket
  // stayed open, reported no error and silently stopped receiving inbox
  // events. It is keyed on a server-issued id per socket now, so a reused
  // browser id displaces nothing. See issues.txt 41.6.
  test("a repeated browser id no longer displaces the previous socket", async () => {
    const first = socket();
    const second = socket();

    await handleWebSocketConnection(first, req({ params: { afterAuthId: "same-id" } }));
    await handleWebSocketConnection(second, req({ params: { afterAuthId: "same-id" } }));

    broadcast(OWN_ORG, { type: "inbox" });

    expect(first.send).toHaveBeenCalledOnce();
    expect(second.send).toHaveBeenCalledOnce();
    expect(first.close).not.toHaveBeenCalled();
  });

  // The close handler was asymmetric in the same way: `delete(browserId)`
  // evicted the entry whoever closed first, so the first tab to close muted the
  // second.
  test("closing one socket does not evict another that reused the id", async () => {
    const first = socket();
    const second = socket();
    await handleWebSocketConnection(first, req({ params: { afterAuthId: "same-id" } }));
    await handleWebSocketConnection(second, req({ params: { afterAuthId: "same-id" } }));

    await first.fire("close");
    broadcast(OWN_ORG, { type: "inbox" });

    expect(second.send).toHaveBeenCalledOnce();
    expect(first.send).not.toHaveBeenCalled();
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

  // A bearer token in a query string is recorded everywhere a URL is. The
  // Authorization header is preferred now; the query string still works so the
  // mobile app can migrate, and its use is logged. See issues.txt 41.3.
  test("prefers the Authorization header", async () => {
    const request: any = {
      query: { accessToken: "from-query" },
      headers: { authorization: "Bearer from-header" },
    };

    await checkMobileId(request, reply());

    expect(getSessionWithoutRequestResponse).toHaveBeenCalledWith("from-header");
  });

  test("still accepts the query string, and warns", async () => {
    const request: any = { query: { accessToken: "eyJhbGciOi..." }, headers: {} };

    await checkMobileId(request, reply());

    expect(getSessionWithoutRequestResponse).toHaveBeenCalledWith("eyJhbGciOi...");
    expect(log.warn).toHaveBeenCalled();
  });

  test("refuses a request carrying no token at all", async () => {
    const rep = reply();

    await checkMobileId({ query: {}, headers: {} } as never, rep);

    expect(rep.code).toHaveBeenCalledWith(401);
    expect(getSessionWithoutRequestResponse).not.toHaveBeenCalled();
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

  // An invalid or absent token made getSessionWithoutRequestResponse reject with
  // no try/catch around it, so the rejection escaped the preHandler instead of
  // answering 401.
  test("an invalid token is refused rather than thrown", async () => {
    (getSessionWithoutRequestResponse as unknown as Mock).mockRejectedValueOnce(
      new Error("UNAUTHORISED"),
    );
    const request: any = { query: { accessToken: "bad" }, headers: {} };
    const rep = reply();

    await expect(checkMobileId(request, rep)).resolves.toBeUndefined();
    expect(rep.code).toHaveBeenCalledWith(401);
    expect(request.user).toBeUndefined();
  });

  // The 401 branch used to send and then carry on to read the payload and set
  // the identity on a request it had already refused.
  test("the 401 branch returns without setting an identity", async () => {
    (getSessionWithoutRequestResponse as unknown as Mock).mockResolvedValueOnce({
      getUserId: (): string | undefined => undefined,
      getAccessTokenPayload: () => ({ role: "ADMIN", orgId: OWN_ORG, email: "a@b.test" }),
    });
    const request: any = { query: { accessToken: "t" }, headers: {} };
    const rep = reply();

    await checkMobileId(request, rep);

    expect(rep.code).toHaveBeenCalledWith(401);
    expect(request.user).toBeUndefined();
  });
});

// ===========================================================================
// The auth endpoint
// ===========================================================================

describe("orgWsAuthCheckHandler", () => {
  // The minted id used to be pushed onto a process-local array keyed by org
  // that nothing read and nothing pruned, inside a class whose other three
  // methods had no callers at all. Both are gone; the endpoint still answers
  // with a 128-bit id so existing clients are unaffected. See issues.txt 41.4.
  test("answers with a 128-bit random id", async () => {
    const rep = reply();

    await orgWsAuthCheckHandler({ user: { orgId: OWN_ORG } } as never, rep);

    expect(rep.send.mock.calls[0][0].afterAuthId).toMatch(/^[0-9a-f]{32}$/);
  });

  test("mints a fresh id per call and retains nothing", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const rep = reply();
      await orgWsAuthCheckHandler({ user: { orgId: OWN_ORG } } as never, rep);
      seen.add(rep.send.mock.calls[0][0].afterAuthId);
    }

    expect(seen.size).toBe(5);
  });

  test("does not need a session org to mint one", async () => {
    const rep = reply();

    await expect(orgWsAuthCheckHandler({} as never, rep)).resolves.toBeUndefined();
    expect(rep.send.mock.calls[0][0].afterAuthId).toMatch(/^[0-9a-f]{32}$/);
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

  test("the mobile socket uses its own bearer-token check", async () => {
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
