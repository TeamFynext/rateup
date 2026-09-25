import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
});

vi.mock("../../utils/prisma.js", () => ({
  default: {
    expoPushToken: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("axios", () => ({ default: { post: vi.fn() } }));
vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import axios from "axios";
import prisma from "../../utils/prisma.js";
import {
  addToken,
  deleteTokenByUserId,
  getTokensByUserId,
  checkPushReceipts,
  sendPushNotification,
} from "./mobile.service.js";
import { addExpoToken, deleteToken, getExpoTokens } from "./mobile.controller.js";
import { mobileNotificationRoutes } from "./mobile.route.js";
import { addExpoTokenSchema, deleteExpoTokenSchema, isExpoPushToken } from "./mobile.schema.js";
import { log } from "../../utils/logger.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  expoPushToken: Record<string, Mock>;
};

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
  db.expoPushToken.upsert.mockResolvedValue({
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

describe("getTokensByUserId", () => {
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
    db.expoPushToken.upsert.mockResolvedValueOnce({ id: "t-1", expoToken: TOKEN });

    await expect(addToken(TOKEN, USER, ORG)).resolves.toMatchObject({ id: "t-1" });
    expect(db.expoPushToken.create).not.toHaveBeenCalled();
  });

  test("matches on all three columns through the unique constraint", async () => {
    await addToken(TOKEN, USER, ORG);

    expect(db.expoPushToken.upsert.mock.calls[0][0].where).toEqual({
      expo_token_user_org_unique: { expoToken: TOKEN, userId: USER, orgId: ORG },
    });
  });

  test("connects the new row to the user and the org", async () => {
    await addToken(TOKEN, USER, ORG);

    expect(db.expoPushToken.upsert.mock.calls[0][0].create).toEqual({
      expoToken: TOKEN,
      user: { connect: { id: USER } },
      org: { connect: { id: ORG } },
    });
  });

  test("re-registering the same device does not write a second row", async () => {
    // The app now re-registers on every foreground, so this is the common case
    // rather than the rare one. `update: {}` leaves the existing row untouched,
    // and the unique index is what makes the upsert collapse instead of insert.
    await addToken(TOKEN, USER, ORG);
    await addToken(TOKEN, USER, ORG);

    expect(db.expoPushToken.create).not.toHaveBeenCalled();
    expect(db.expoPushToken.upsert).toHaveBeenCalledTimes(2);
    expect(db.expoPushToken.upsert.mock.calls[1][0].update).toEqual({});
  });

  test("refuses a call missing any of the three values", async () => {
    await expect(addToken("", USER, ORG)).rejects.toThrow("Missing expoToken or userId or orgId");
    await expect(addToken(TOKEN, "", ORG)).rejects.toThrow();
    await expect(addToken(TOKEN, USER, "")).rejects.toThrow();
  });

  test("a write failure answers a 500 in the module's own shape", async () => {
    db.expoPushToken.upsert.mockRejectedValueOnce(new Error("Foreign key constraint failed"));
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

    const call = db.expoPushToken.upsert.mock.calls[0][0];
    expect(call.where.expo_token_user_org_unique).toEqual({
      expoToken: TOKEN,
      userId: USER,
      orgId: ORG,
    });
    expect(call.create.user.connect.id).toBe(USER);
    expect(call.create.org.connect.id).toBe(ORG);
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

    // No tickets to trace, so no receipt pass is scheduled.
    await expect(sendPushNotification([TOKEN], "t", "b")).resolves.toEqual({});
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

// ===========================================================================
// The receipt pass — where delivery actually succeeds or fails
// ===========================================================================

describe("checkPushReceipts", () => {
  const TICKET = "ticket-aaa";
  const OTHER_TICKET = "ticket-bbb";

  test("a send returns its ticket ids mapped to the tokens they were sent to", async () => {
    // This map is the only link between a receipt and a device: receipts carry
    // the ticket id alone.
    (axios.post as unknown as Mock).mockResolvedValueOnce({
      status: 200,
      data: {
        data: [
          { status: "ok", id: TICKET },
          { status: "ok", id: OTHER_TICKET },
        ],
      },
    });

    await expect(sendPushNotification([TOKEN, COLLEAGUE_TOKEN], "t", "b")).resolves.toEqual({
      [TICKET]: TOKEN,
      [OTHER_TICKET]: COLLEAGUE_TOKEN,
    });
  });

  test("deletes the token behind a DeviceNotRegistered receipt", async () => {
    // The reason this pass exists: most DeviceNotRegistered results appear here
    // and never in the ticket, so a ticket-only check leaves dead tokens behind.
    (axios.post as unknown as Mock).mockResolvedValueOnce({
      status: 200,
      data: { data: { [TICKET]: { status: "error", details: { error: "DeviceNotRegistered" } } } },
    });

    await checkPushReceipts({ [TICKET]: TOKEN });

    expect(db.expoPushToken.deleteMany).toHaveBeenCalledWith({
      where: { expoToken: { in: [TOKEN] } },
    });
  });

  test("reports a credential failure without deleting the token", async () => {
    // A broken FCM/APNs key fails every push to that platform. The device is
    // fine, so removing its token would be wrong — and would quietly shrink the
    // audience while someone hunts the real fault.
    (axios.post as unknown as Mock).mockResolvedValueOnce({
      status: 200,
      data: { data: { [TICKET]: { status: "error", details: { error: "MismatchSenderId" } } } },
    });

    await checkPushReceipts({ [TICKET]: TOKEN });

    expect(db.expoPushToken.deleteMany).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: "MismatchSenderId" }),
      expect.stringContaining("credentials"),
    );
  });

  test("logs any other receipt error and keeps the token", async () => {
    (axios.post as unknown as Mock).mockResolvedValueOnce({
      status: 200,
      data: { data: { [TICKET]: { status: "error", details: { error: "MessageRateExceeded" } } } },
    });

    await checkPushReceipts({ [TICKET]: TOKEN });

    expect(db.expoPushToken.deleteMany).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalled();
  });

  test("leaves an ok receipt alone", async () => {
    (axios.post as unknown as Mock).mockResolvedValueOnce({
      status: 200,
      data: { data: { [TICKET]: { status: "ok" } } },
    });

    await checkPushReceipts({ [TICKET]: TOKEN });

    expect(db.expoPushToken.deleteMany).not.toHaveBeenCalled();
  });

  test("skips a ticket Expo has no answer for yet", async () => {
    // Receipts are not always ready. An absent id is not an error: the next send
    // produces a new ticket, so nothing is lost by missing this one.
    (axios.post as unknown as Mock).mockResolvedValueOnce({ status: 200, data: { data: {} } });

    await checkPushReceipts({ [TICKET]: TOKEN });

    expect(db.expoPushToken.deleteMany).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });

  test("asks nothing when there are no tickets", async () => {
    await checkPushReceipts({});

    expect(axios.post).not.toHaveBeenCalled();
  });

  test("a transport failure propagates so BullMQ retries", async () => {
    (axios.post as unknown as Mock).mockRejectedValueOnce(new Error("network"));

    await expect(checkPushReceipts({ [TICKET]: TOKEN })).rejects.toThrow("network");
  });
});

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

    expect(hooks).toEqual([{ name: "onRoute", fn: expect.any(Function) }]);
    const probe: any = { method: "GET", url: "/x", config: {} };
    hooks[0].fn(probe);
    expect(probe.config).toEqual({ access: "session" });
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
