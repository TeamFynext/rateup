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

import axios from "axios";
import prisma from "../../utils/prisma.js";
import { checkSession } from "../../utils/checkSession.js";
import {
  addToken,
  deleteTokenByUserId,
  getTokensByOrgId,
  sendPushNotification,
} from "./mobile.service.js";
import { addExpoToken, deleteToken, getExpoTokens } from "./mobile.controller.js";
import { mobileNotificationRoutes } from "./mobile.route.js";
import { addExpoTokenSchema, deleteExpoTokenSchema } from "./mobile.schema.js";

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

  // NOTE: the filter is the org alone — the caller's own userId is not part of
  // it, so the list covers every colleague's devices.
  test("does not narrow the list to the caller", async () => {
    await getTokensByOrgId(ORG);

    expect(JSON.stringify(db.expoPushToken.findMany.mock.calls[0][0].where)).not.toContain("user");
  });

  test("refuses an empty org id", async () => {
    await expect(getTokensByOrgId("")).rejects.toThrow("Missing orgId");
    expect(db.expoPushToken.findMany).not.toHaveBeenCalled();
  });

  // NOTE: GET /api/mobilenotification hands the raw token strings to any member
  // with a session. The two real senders — notification.service.ts:162 and
  // wasurvey.controller.ts:554 — call getTokensByOrgId server-side, so a client
  // never needs them.
  test("the handler returns the raw tokens to any member of the org", async () => {
    db.expoPushToken.findMany.mockResolvedValueOnce([{ expoToken: COLLEAGUE_TOKEN }]);

    const res = await getExpoTokens({ user: { orgId: ORG, userId: USER } } as never, reply());

    expect(res).toEqual([COLLEAGUE_TOKEN]);
  });

  test("the handler takes the org from the session", async () => {
    await getExpoTokens({ user: { orgId: ORG, userId: USER } } as never, reply());

    expect(db.expoPushToken.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG });
  });

  test("a read failure answers a fixed 500", async () => {
    db.expoPushToken.findMany.mockRejectedValueOnce(new Error("db down"));
    const rep = reply();

    await getExpoTokens({ user: { orgId: ORG } } as never, rep);

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

  // NOTE: ExpoPushToken declares two indexes and no unique constraint
  // (prisma/schema.prisma:2432-2444), so the read-then-create has nothing
  // behind it — two concurrent registrations both find nothing and both write.
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

  // NOTE: neither the handler nor the service has a try/catch, so a failed
  // connect escapes to the global error handler.
  test("a write failure escapes the handler", async () => {
    db.expoPushToken.create.mockRejectedValueOnce(new Error("Foreign key constraint failed"));

    await expect(
      addExpoToken(
        { user: { userId: USER, orgId: ORG }, body: { expoToken: TOKEN } } as never,
        reply(),
      ),
    ).rejects.toThrow("Foreign key constraint failed");
  });

  // NOTE: the handler returns the created row, so the response carries the
  // internal id, the userId and the orgId alongside the token.
  test("the handler answers with the whole stored row", async () => {
    const res = await addExpoToken(
      { user: { userId: USER, orgId: ORG }, body: { expoToken: TOKEN } } as never,
      reply(),
    );

    expect(res).toEqual({ id: "t-1", expoToken: TOKEN, userId: USER, orgId: ORG });
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

  // NOTE: the send path accepts any string beginning with the prefix, while the
  // route schema requires the full ExponentPushToken[...] form — so a value
  // stored by another path could pass here and be rejected by Expo.
  test("the send filter is looser than the schema that guards the route", async () => {
    await sendPushNotification(["ExponentPushTokenWITHOUT-BRACKETS"], "t", "b");

    expect((axios.post as unknown as Mock).mock.calls[0][1]).toHaveLength(1);
    expect(
      addExpoTokenSchema.safeParse({ expoToken: "ExponentPushTokenWITHOUT-BRACKETS" }).success,
    ).toBe(false);
  });

  // NOTE: every failure is caught and logged, so the caller cannot tell a
  // delivered batch from a rejected one.
  test("a transport failure resolves silently", async () => {
    (axios.post as unknown as Mock).mockRejectedValueOnce(new Error("ECONNRESET"));

    await expect(sendPushNotification([TOKEN], "t", "b")).resolves.toBeUndefined();
  });

  test("an Expo error response is not inspected either", async () => {
    (axios.post as unknown as Mock).mockResolvedValueOnce({
      status: 200,
      data: { data: [{ status: "error", message: "DeviceNotRegistered" }] },
    });

    await expect(sendPushNotification([TOKEN], "t", "b")).resolves.toBeUndefined();
  });

  // NOTE: the whole token list goes out as a single request. Expo's push API
  // caps a batch at 100 messages; nothing here chunks.
  test("sends every token in one unbatched request", async () => {
    const many = Array.from(
      { length: 250 },
      (_, i) => `ExponentPushToken[${String(i).padStart(22, "0")}]`,
    );

    await sendPushNotification(many, "t", "b");

    expect(axios.post).toHaveBeenCalledOnce();
    expect((axios.post as unknown as Mock).mock.calls[0][1]).toHaveLength(250);
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
