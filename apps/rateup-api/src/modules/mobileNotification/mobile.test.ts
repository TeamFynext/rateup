import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
});

vi.mock("../../utils/prisma.js", () => ({
  default: {
    expoPushToken: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock("axios", () => ({ default: { post: vi.fn() } }));
vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import axios from "axios";
import prisma from "../../utils/prisma.js";
import { checkSession } from "../../utils/checkSession.js";
import {
  addToken,
  deleteTokenByUserId,
  getTokensByOrgId,
  getTokensByUserId,
  sendPushNotification,
} from "./mobile.service.js";
import { addExpoToken, deleteToken, getExpoTokens } from "./mobile.controller.js";
import { mobileNotificationRoutes } from "./mobile.route.js";
import { addExpoTokenSchema, deleteExpoTokenSchema, isExpoPushToken } from "./mobile.schema.js";
import { log } from "../../utils/logger.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { expoPushToken: Record<string, Mock> };

const USER = "11111111-1111-1111-1111-111111111111";
const COLLEAGUE = "22222222-2222-2222-2222-222222222222";
const ORG = "33333333-3333-3333-3333-333333333333";
const TOKEN = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
const COLLEAGUE_TOKEN = "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]";

function reply() {
  const rep: any = { status: vi.fn(() => rep), code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return {
    code: rep.status.mock.calls[0]?.[0] ?? rep.code.mock.calls[0]?.[0],
    body: rep.send.mock.calls[0]?.[0],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.expoPushToken.findFirst.mockResolvedValue(null);
  db.expoPushToken.findMany.mockResolvedValue([]);
  db.expoPushToken.create.mockResolvedValue({
    id: "t-1",
    expoToken: TOKEN,
    userId: USER,
    orgId: ORG,
  });
  db.expoPushToken.deleteMany.mockResolvedValue({ count: 1 });
  (axios.post as unknown as Mock).mockResolvedValue({ status: 200, data: {} });
});

// ===========================================================================
// The org-wide token listing
// ===========================================================================

describe("getTokensByOrgId", () => {
  test("returns every token registered against the org", async () => {
    db.expoPushToken.findMany.mockResolvedValueOnce([
      { expoToken: TOKEN },
      { expoToken: COLLEAGUE_TOKEN },
    ]);

    await expect(getTokensByOrgId(ORG)).resolves.toEqual([TOKEN, COLLEAGUE_TOKEN]);
    expect(db.expoPushToken.findMany).toHaveBeenCalledWith({
      where: { orgId: ORG },
      select: { expoToken: true },
    });
  });

  // The org-wide read stays — it is what the server-side senders need. What
  // changed is that the route no longer uses it.
  test("is still the org-wide read the senders use", async () => {
    await getTokensByOrgId(ORG);

    expect(JSON.stringify(db.expoPushToken.findMany.mock.calls[0][0].where)).not.toContain("user");
  });

  test("the per-user read narrows on both columns", async () => {
    db.expoPushToken.findMany.mockResolvedValueOnce([{ expoToken: TOKEN }]);

    await expect(getTokensByUserId(USER, ORG)).resolves.toEqual([TOKEN]);
    expect(db.expoPushToken.findMany).toHaveBeenCalledWith({
      where: { userId: USER, orgId: ORG },
      select: { expoToken: true },
    });
  });

  test("the per-user read refuses a missing id", async () => {
    await expect(getTokensByUserId("", ORG)).rejects.toThrow("Missing userId or orgId");
    await expect(getTokensByUserId(USER, "")).rejects.toThrow("Missing userId or orgId");
    expect(db.expoPushToken.findMany).not.toHaveBeenCalled();
  });

  test("refuses an empty org id", async () => {
    await expect(getTokensByOrgId("")).rejects.toThrow("Missing orgId");
    expect(db.expoPushToken.findMany).not.toHaveBeenCalled();
  });

  // GET /api/mobilenotification used to hand the raw token strings for every
  // device in the organisation to any member with a session. An Expo push token
  // is a send credential and a durable device identifier, and no client needs
  // another device's — both real senders (notification.service.ts:162 and
  // wasurvey.controller.ts:554) read them server-side.
  test("the handler returns only the caller's own tokens", async () => {
    db.expoPushToken.findMany.mockResolvedValueOnce([{ expoToken: TOKEN }]);

    const res = await getExpoTokens({ user: { orgId: ORG, userId: USER } } as never, reply());

    expect(res).toEqual([TOKEN]);
    expect(db.expoPushToken.findMany.mock.calls[0][0].where).toEqual({
      userId: USER,
      orgId: ORG,
    });
  });

  test("a read failure answers a fixed 500", async () => {
    db.expoPushToken.findMany.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await getExpoTokens({ user: { orgId: ORG, userId: USER } } as never, rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Failed to fetch tokens" } });
  });
});

// ===========================================================================
// addToken — the check that nothing enforces
// ===========================================================================

describe("addToken", () => {
  test("returns the existing row rather than creating a second", async () => {
    db.expoPushToken.findFirst.mockResolvedValueOnce({ id: "t-1", expoToken: TOKEN });

    await expect(addToken(TOKEN, USER, ORG)).resolves.toMatchObject({ id: "t-1" });
    expect(db.expoPushToken.create).not.toHaveBeenCalled();
  });

  test("looks for a match on all three columns", async () => {
    await addToken(TOKEN, USER, ORG);

    expect(db.expoPushToken.findFirst.mock.calls[0][0].where).toEqual({
      expoToken: TOKEN,
      userId: USER,
      orgId: ORG,
    });
  });

  test("connects the new row to the user and the org", async () => {
    await addToken(TOKEN, USER, ORG);

    expect(db.expoPushToken.create.mock.calls[0][0].data).toEqual({
      expoToken: TOKEN,
      user: { connect: { id: USER } },
      org: { connect: { id: ORG } },
    });
  });

  // STILL OPEN: ExpoPushToken declares two indexes and no
  // unique constraint (prisma/schema.prisma:2432-2444), so the read-then-create
  // has nothing behind it — two concurrent registrations both find nothing and
  // both write. Closing it needs @@unique([expoToken, userId, orgId]), which
  // needs existing duplicates collapsed first.
  test("nothing prevents a second row for the same device", async () => {
    db.expoPushToken.findFirst.mockResolvedValue(null);

    await addToken(TOKEN, USER, ORG);
    await addToken(TOKEN, USER, ORG);

    expect(db.expoPushToken.create).toHaveBeenCalledTimes(2);
  });

  test("refuses a call missing any of the three values", async () => {
    await expect(addToken("", USER, ORG)).rejects.toThrow("Missing expoToken or userId or orgId");
    await expect(addToken(TOKEN, "", ORG)).rejects.toThrow();
    await expect(addToken(TOKEN, USER, "")).rejects.toThrow();
  });

  // This was the one handler in the file with no try/catch, so a failed connect
  // escaped to the global error handler and the client got a different error
  // shape from this route than from its two neighbours.
  test("a write failure answers a 500 in the module's own shape", async () => {
    db.expoPushToken.create.mockRejectedValueOnce(new Error("Foreign key constraint failed"));
    const rep = reply();

    await expect(
      addExpoToken(
        { user: { userId: USER, orgId: ORG }, body: { expoToken: TOKEN } } as never,
        rep,
      ),
    ).resolves.toBeUndefined();
    expect(answer(rep)).toEqual({ code: 500, body: { error: "Failed to register token" } });
  });

  // It also answered with the created row, echoing the token and the internal
  // ids back to the device that had just sent them — a second place the token
  // appears in logs and network captures.
  test("the handler answers with a status rather than the row", async () => {
    const rep = reply();

    const res = await addExpoToken(
      { user: { userId: USER, orgId: ORG }, body: { expoToken: TOKEN } } as never,
      rep,
    );

    expect(res).toBeUndefined();
    expect(answer(rep)).toEqual({ code: 201, body: { ok: "Token registered" } });
  });

  test("the handler takes the identity from the session, not the body", async () => {
    await addExpoToken(
      {
        user: { userId: USER, orgId: ORG },
        body: { expoToken: TOKEN, userId: COLLEAGUE, orgId: "somewhere-else" },
      } as never,
      reply(),
    );

    expect(db.expoPushToken.create.mock.calls[0][0].data.user.connect.id).toBe(USER);
    expect(db.expoPushToken.create.mock.calls[0][0].data.org.connect.id).toBe(ORG);
  });
});

// ===========================================================================
// deleteTokenByUserId
// ===========================================================================

describe("deleteTokenByUserId", () => {
  test("removes only rows belonging to the caller", async () => {
    await deleteTokenByUserId(USER, TOKEN);

    expect(db.expoPushToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER, expoToken: TOKEN },
    });
  });

  // NOTE: the filter has no org, so a user who belongs to more than one
  // organisation unregisters the device from all of them at once.
  test("the delete is not narrowed to an organisation", async () => {
    await deleteTokenByUserId(USER, TOKEN);

    expect(JSON.stringify(db.expoPushToken.deleteMany.mock.calls[0][0].where)).not.toContain(
      "orgId",
    );
  });

  test("deleting nothing is still a success", async () => {
    db.expoPushToken.deleteMany.mockResolvedValueOnce({ count: 0 });
    const rep = reply();

    await deleteToken({ user: { userId: USER }, body: { expoToken: TOKEN } } as never, rep);

    expect(answer(rep)).toEqual({ code: 200, body: { ok: "Token deleted", token: { count: 0 } } });
  });

  test("refuses a call missing either value", async () => {
    await expect(deleteTokenByUserId("", TOKEN)).rejects.toThrow("Missing userId or ExpoToken");
    await expect(deleteTokenByUserId(USER, "")).rejects.toThrow();
  });

  test("a failure answers a fixed 500", async () => {
    db.expoPushToken.deleteMany.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await deleteToken({ user: { userId: USER }, body: { expoToken: TOKEN } } as never, rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Failed to delete tokens" } });
  });
});

// ===========================================================================
// sendPushNotification
// ===========================================================================

describe("sendPushNotification", () => {
  test("posts one message per token to the Expo endpoint", async () => {
    await sendPushNotification([TOKEN, COLLEAGUE_TOKEN], "Title", "Body", { a: 1 });

    const [url, messages, config] = (axios.post as unknown as Mock).mock.calls[0];
    expect(url).toBe("https://exp.host/--/api/v2/push/send");
    expect(messages).toEqual([
      { to: TOKEN, sound: "default", title: "Title", body: "Body", data: { a: 1 } },
      { to: COLLEAGUE_TOKEN, sound: "default", title: "Title", body: "Body", data: { a: 1 } },
    ]);
    expect(config.headers["Content-Type"]).toBe("application/json");
  });

  test("does nothing for an empty or non-array input", async () => {
    await sendPushNotification([], "t", "b");
    await sendPushNotification(undefined as never, "t", "b");

    expect(axios.post).not.toHaveBeenCalled();
  });

  test("drops tokens that do not look like Expo tokens", async () => {
    await sendPushNotification([TOKEN, "not-a-token", 42 as never], "t", "b");

    expect((axios.post as unknown as Mock).mock.calls[0][1]).toHaveLength(1);
  });

  // The send path used to accept any string beginning with the prefix while the
  // route schema required the full ExponentPushToken[...] form, so a value
  // stored by a path that skipped the schema was handed to Expo and rejected in
  // a response body nothing read. One predicate now.
  test("the send filter agrees with the schema that guards the route", async () => {
    await sendPushNotification(["ExponentPushTokenWITHOUT-BRACKETS"], "t", "b");

    expect(axios.post).not.toHaveBeenCalled();
    expect(
      addExpoTokenSchema.safeParse({ expoToken: "ExponentPushTokenWITHOUT-BRACKETS" }).success,
    ).toBe(false);
  });

  test("and on the length bound too", async () => {
    // Passes the bracketed pattern, fails the 20-character minimum.
    await sendPushNotification(["ExponentPushToken[a"], "t", "b");

    expect(axios.post).not.toHaveBeenCalled();
    expect(isExpoPushToken(TOKEN)).toBe(true);
  });

  // Every failure used to be caught and logged, so no caller could tell a
  // delivered batch from a rejected one. The only caller is a BullMQ processor,
  // which is where a retry belongs.
  test("a transport failure propagates", async () => {
    (axios.post as unknown as Mock).mockRejectedValueOnce(new Error("ECONNRESET"));

    await expect(sendPushNotification([TOKEN], "t", "b")).rejects.toThrow("ECONNRESET");
  });

  // Expo reports per-message failures in the body of a 200. DeviceNotRegistered
  // is how a stale token is meant to be pruned, and nothing read it — so dead
  // tokens accumulated and were pushed to forever.
  test("a token Expo reports as unregistered is deleted", async () => {
    (axios.post as unknown as Mock).mockResolvedValueOnce({
      status: 200,
      data: {
        data: [
          { status: "ok", id: "r-1" },
          { status: "error", message: "not registered", details: { error: "DeviceNotRegistered" } },
        ],
      },
    });

    await sendPushNotification([TOKEN, COLLEAGUE_TOKEN], "t", "b");

    expect(db.expoPushToken.deleteMany).toHaveBeenCalledWith({
      where: { expoToken: { in: [COLLEAGUE_TOKEN] } },
    });
  });

  test("any other per-message error is logged, not deleted", async () => {
    (axios.post as unknown as Mock).mockResolvedValueOnce({
      status: 200,
      data: { data: [{ status: "error", message: "MessageTooBig", details: {} }] },
    });

    await sendPushNotification([TOKEN], "t", "b");

    expect(db.expoPushToken.deleteMany).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalled();
  });

  test("a body with no ticket array is tolerated", async () => {
    (axios.post as unknown as Mock).mockResolvedValueOnce({ status: 200, data: {} });

    await expect(sendPushNotification([TOKEN], "t", "b")).resolves.toBeUndefined();
    expect(db.expoPushToken.deleteMany).not.toHaveBeenCalled();
  });

  // Expo's push API caps a request at 100 messages, and the whole org's token
  // list used to go out unbatched — so an organisation past that size had its
  // notifications rejected wholesale, silently.
  test("chunks the token list into hundreds", async () => {
    const many = Array.from(
      { length: 250 },
      (_, i) => `ExponentPushToken[${String(i).padStart(22, "0")}]`,
    );

    await sendPushNotification(many, "t", "b");

    const calls = (axios.post as unknown as Mock).mock.calls;
    expect(calls).toHaveLength(3);
    expect(calls.map((c: any) => c[1].length)).toEqual([100, 100, 50]);
  });

  test("defaults the data payload to an empty object", async () => {
    await sendPushNotification([TOKEN], "t", "b");

    expect((axios.post as unknown as Mock).mock.calls[0][1][0].data).toEqual({});
  });
});

// ===========================================================================
// The schemas
// ===========================================================================

describe("the token schema", () => {
  test("requires the bracketed Expo form", () => {
    expect(addExpoTokenSchema.safeParse({ expoToken: TOKEN }).success).toBe(true);
    expect(addExpoTokenSchema.safeParse({ expoToken: "FCMToken[abc]" }).success).toBe(false);
    expect(addExpoTokenSchema.safeParse({ expoToken: "ExponentPushToken[]" }).success).toBe(false);
  });

  test("enforces a minimum length", () => {
    expect(addExpoTokenSchema.safeParse({ expoToken: "ExponentPushToken[a]" }).success).toBe(true);
    expect(addExpoTokenSchema.safeParse({ expoToken: "short" }).success).toBe(false);
  });

  test("the delete schema is the same shape", () => {
    expect(deleteExpoTokenSchema.safeParse({ expoToken: TOKEN }).success).toBe(true);
    expect(deleteExpoTokenSchema.safeParse({}).success).toBe(false);
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("mobileNotificationRoutes", () => {
  async function collect() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };
    await mobileNotificationRoutes(srv);
    return { routes, hooks };
  }

  test("requires a session for the whole tree", async () => {
    const { hooks } = await collect();

    expect(hooks).toEqual([{ name: "preHandler", fn: checkSession }]);
  });

  test("registers three routes on the collection path", async () => {
    const { routes } = await collect();

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual(["POST /", "GET /", "DELETE /"]);
  });

  test("both writers validate their body", async () => {
    const { routes } = await collect();

    expect(routes[0].opts.schema.body).toBe(addExpoTokenSchema);
    expect(routes[2].opts.schema.body).toBe(deleteExpoTokenSchema);
  });

  // NOTE: the read carries no schema and no role requirement — it is the one
  // route that returns other people's tokens.
  test("the listing declares nothing at all", async () => {
    const { routes } = await collect();

    const list = routes.find((r) => r.method === "GET");
    expect(list.opts).toBe(getExpoTokens);
    expect(list.handler).toBeUndefined();
  });

  test("no route declares a role requirement", async () => {
    const { routes } = await collect();

    for (const r of routes) {
      expect(r.opts?.preHandler).toBeUndefined();
    }
  });
});
