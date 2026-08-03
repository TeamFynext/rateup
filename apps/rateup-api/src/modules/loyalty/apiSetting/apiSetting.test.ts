import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyApiSettings: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import {
  createLoyaltyApiSetting,
  getLoyaltyApiSettingById,
  getLoyaltyApiSettings,
  updateLoyaltyApiSetting,
} from "./apiSetting.service.js";
import {
  createLoyaltyApiSettingHandler,
  getLoyaltyApiSettingByIdHandler,
  getLoyaltyApiSettingsHandler,
  updateLoyaltyApiSettingHandler,
} from "./apiSetting.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { loyaltyApiSettings: Record<string, Mock> };

const ORG = "11111111-1111-4111-8111-111111111111";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function request(over: Record<string, unknown> = {}): any {
  return { user: { orgId: ORG }, params: {}, query: {}, body: {}, ...over };
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyApiSettings.findMany.mockResolvedValue([]);
  db.loyaltyApiSettings.findUnique.mockResolvedValue(null);
  db.loyaltyApiSettings.create.mockResolvedValue({ id: "api-1" });
  db.loyaltyApiSettings.update.mockResolvedValue({ id: "api-1" });
});

describe("the api-setting service", () => {
  test("lists only the caller's org", async () => {
    await getLoyaltyApiSettings(ORG);

    expect(db.loyaltyApiSettings.findMany).toHaveBeenCalledWith({ where: { orgId: ORG } });
  });

  test("a single setting is matched on the id and the org together", async () => {
    await getLoyaltyApiSettingById("api-1", ORG);

    expect(db.loyaltyApiSettings.findUnique.mock.calls[0][0].where).toEqual({
      id: "api-1",
      orgId: ORG,
    });
  });

  test("a new setting is stamped with the caller's org", async () => {
    await createLoyaltyApiSetting({ name: "POS", feature: "action" } as any, ORG);

    expect(db.loyaltyApiSettings.create.mock.calls[0][0].data).toMatchObject({
      name: "POS",
      feature: "action",
      orgId: ORG,
    });
  });

  test("empty action and reward ids are stored as absent rather than blank", async () => {
    await createLoyaltyApiSetting({ name: "POS", actionId: "", rewardId: "" } as any, ORG);

    expect(db.loyaltyApiSettings.create.mock.calls[0][0].data).toMatchObject({
      actionId: undefined,
      rewardId: undefined,
    });
  });

  test("real ids are kept", async () => {
    await createLoyaltyApiSetting({ name: "POS", actionId: "act-1" } as any, ORG);

    expect(db.loyaltyApiSettings.create.mock.calls[0][0].data.actionId).toBe("act-1");
  });

  test("an update keeps only the id that matches the chosen feature", async () => {
    await updateLoyaltyApiSetting(
      "api-1",
      {
        feature: "reward",
        actionId: "act-1",
        rewardId: "rwd-1",
      },
      ORG,
    );

    expect(db.loyaltyApiSettings.update.mock.calls[0][0].data).toMatchObject({
      actionId: undefined,
      rewardId: "rwd-1",
    });
  });

  test("switching a setting to an action clears the reward link", async () => {
    await updateLoyaltyApiSetting(
      "api-1",
      {
        feature: "action",
        actionId: "act-1",
        rewardId: "rwd-1",
      },
      ORG,
    );

    expect(db.loyaltyApiSettings.update.mock.calls[0][0].data).toMatchObject({
      actionId: "act-1",
      rewardId: undefined,
    });
  });

  // The read and the create were both org-scoped and the update was not: it took
  // the setting id alone, and its handler never read `request.user` at all, so an
  // API setting belonging to another org could be repointed at a different action
  // or reward.
  test("an update is scoped to the caller's org", async () => {
    await updateLoyaltyApiSetting("api-other-org", { feature: "action", actionId: "act-1" }, ORG);

    expect(db.loyaltyApiSettings.update.mock.calls[0][0].where).toEqual({
      id: "api-other-org",
      orgId: ORG,
    });
  });

  // NOTE: `...(data as any)` spreads the whole request body into prisma, so any
  // column the schema does not mention still reaches the write.
  test("spreads the whole body into the create", async () => {
    await createLoyaltyApiSetting({ name: "POS", somethingElse: "x" } as any, ORG);

    expect(db.loyaltyApiSettings.create.mock.calls[0][0].data.somethingElse).toBe("x");
  });
});

describe("the api-setting controller", () => {
  test("lists the caller's settings", async () => {
    db.loyaltyApiSettings.findMany.mockResolvedValue([{ id: "api-1" }]);
    const rep = reply();

    await getLoyaltyApiSettingsHandler(request(), rep);

    expect(answer(rep)).toEqual({ code: 200, body: [{ id: "api-1" }] });
  });

  test("fetches one setting within the caller's org", async () => {
    const rep = reply();

    await getLoyaltyApiSettingByIdHandler(request({ params: { id: "api-1" } }), rep);

    expect(db.loyaltyApiSettings.findUnique.mock.calls[0][0].where).toEqual({
      id: "api-1",
      orgId: ORG,
    });
    expect(answer(rep).code).toBe(200);
  });

  test("answers 200 with null for a setting the org cannot see", async () => {
    const rep = reply();

    await getLoyaltyApiSettingByIdHandler(request({ params: { id: "api-other" } }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: null });
  });

  test("creates against the caller's org", async () => {
    const rep = reply();

    await createLoyaltyApiSettingHandler(request({ body: { name: "POS" } }), rep);

    expect(db.loyaltyApiSettings.create.mock.calls[0][0].data.orgId).toBe(ORG);
    expect(answer(rep).code).toBe(200);
  });

  // The handler used to never read `request.user` at all, so the org was not even
  // available to the update it called.
  test("takes the org from the session and scopes the update with it", async () => {
    const rep = reply();

    await updateLoyaltyApiSettingHandler(
      request({ params: { id: "api-other-org" }, body: { feature: "action" } }),
      rep,
    );

    expect(db.loyaltyApiSettings.update.mock.calls[0][0].where).toEqual({
      id: "api-other-org",
      orgId: ORG,
    });
    expect(answer(rep).code).toBe(200);
  });

  // Every catch in this controller used to be `reply.send(e)` with the Error
  // object itself. An Error has no enumerable own properties, so that serialises
  // to `{}` — the client got a 500 with an empty body and no message, and could
  // not tell a validation failure from a database outage. The rest of the module
  // sends `{ error: e.message }`.
  test("answers a failure with the message, not an empty object", async () => {
    db.loyaltyApiSettings.findMany.mockRejectedValue(new Error("connection lost"));
    const rep = reply();

    await getLoyaltyApiSettingsHandler(request(), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "connection lost" } });
    expect(JSON.stringify(answer(rep).body)).not.toBe("{}");
  });

  test("every handler reports a failure the same way", async () => {
    db.loyaltyApiSettings.findUnique.mockRejectedValue(new Error("x"));
    db.loyaltyApiSettings.create.mockRejectedValue(new Error("x"));
    db.loyaltyApiSettings.update.mockRejectedValue(new Error("x"));

    const reps = [reply(), reply(), reply()];
    await getLoyaltyApiSettingByIdHandler(request({ params: { id: "api-1" } }), reps[0]);
    await createLoyaltyApiSettingHandler(request({ body: {} }), reps[1]);
    await updateLoyaltyApiSettingHandler(request({ params: { id: "api-1" }, body: {} }), reps[2]);

    for (const rep of reps) {
      expect(answer(rep)).toEqual({ code: 500, body: { error: "x" } });
    }
  });
});
