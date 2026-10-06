import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    integration: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    team: { findMany: vi.fn() },
    $executeRaw: vi.fn(),
  },
}));
vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    default: { ...actual.default, post: vi.fn(), isAxiosError: actual.isAxiosError },
  };
});

import axios, { AxiosError, AxiosHeaders } from "axios";
import type { Integration } from "../../../../../generated/prisma/client.js";
import prisma from "../../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../../workers/bullmq/queues/index.js";
import type { ProviderJobData } from "../../providers/integrationProvider.types.js";
import {
  deliverZapierHook,
  drainLegacyZapierJob,
  queueZapierTrigger,
  ZAPIER_JOB_OPTIONS,
} from "./zapier.deliver.js";
import { buildZapierPayload } from "./zapier.payloads.js";
import { ZAPIER_DELIVERY, ZapierTriggers } from "./zapier.types.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  integration: { findUnique: Mock };
  user: { findMany: Mock };
  team: { findMany: Mock };
  $executeRaw: Mock;
};
const post = axios.post as unknown as Mock;
const add = integrationTriggerQueue.add as unknown as Mock;

const ORG = "org-1";
const HOOK_A = "https://hooks.zapier.com/a";
const HOOK_B = "https://hooks.zapier.com/b";

const zapier = (subscriptions: { hookUrl: string; subscribed_field: string; active: boolean }[]) =>
  ({
    id: "int-z",
    orgId: ORG,
    name: "zapier",
    active: true,
    credential: { accessToken: "hash", triggerSubscriptions: subscriptions },
  }) as unknown as Integration;

const contact = {
  id: "c1",
  name: "Ann",
  phone: "919000000001",
  email: "ann@example.com",
  source: "WHATSAPP",
  igsId: null,
  notes: "not sent",
};

const httpError = (status: number) =>
  new AxiosError("failed", String(status), undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: null,
  });

const deliveryJob = (hookUrl = HOOK_A): ProviderJobData => ({
  integrationName: "zapier",
  triggerKey: ZAPIER_DELIVERY,
  orgId: ORG,
  data: { trigger: ZapierTriggers.CONTACT_CREATE, hookUrl, payload: { id: "c1" } },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("queueZapierTrigger", () => {
  test("queues one delivery per active hook, with the payload built once", async () => {
    const integration = zapier([
      { hookUrl: HOOK_A, subscribed_field: "new_contact_create", active: true },
      { hookUrl: HOOK_B, subscribed_field: "new_contact_create", active: true },
      { hookUrl: "https://off", subscribed_field: "new_contact_create", active: false },
      { hookUrl: "https://other", subscribed_field: "contact_deleted", active: true },
    ]);

    await queueZapierTrigger(integration, ZapierTriggers.CONTACT_CREATE, contact);

    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenCalledWith(
      "zapier-new_contact_create",
      {
        integrationName: "zapier",
        triggerKey: ZAPIER_DELIVERY,
        orgId: ORG,
        data: {
          trigger: "new_contact_create",
          hookUrl: HOOK_B,
          payload: {
            id: "c1",
            name: "Ann",
            phone: "919000000001",
            email: "ann@example.com",
            source: "WHATSAPP",
            igsId: null,
          },
        },
      },
      ZAPIER_JOB_OPTIONS,
    );
  });

  test("builds nothing when no Zap listens", async () => {
    await queueZapierTrigger(zapier([]), ZapierTriggers.CONTACT_ASSIGN, {
      contact,
      newAssignees: [{ userId: "u1", teamId: "t1" }],
    });

    expect(db.user.findMany).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });
});

describe("deliverZapierHook", () => {
  const listening = () =>
    zapier([{ hookUrl: HOOK_A, subscribed_field: "new_contact_create", active: true }]);

  test("any 2xx is delivered", async () => {
    post.mockResolvedValue({ status: 202 });

    await deliverZapierHook(listening(), deliveryJob(), { finalAttempt: false });

    expect(post).toHaveBeenCalledWith(HOOK_A, { id: "c1" }, expect.anything());
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  test("a 410 switches that hook off and is not retried", async () => {
    post.mockRejectedValue(httpError(410));

    await expect(
      deliverZapierHook(listening(), deliveryJob(), { finalAttempt: false }),
    ).resolves.toBeUndefined();

    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    // The hook that failed is the one named in the statement, not a neighbour by position.
    expect(db.$executeRaw.mock.calls[0]).toContain(HOOK_A);
  });

  test("another failure is thrown for a retry and leaves the hook on", async () => {
    post.mockRejectedValue(httpError(500));

    await expect(
      deliverZapierHook(listening(), deliveryJob(), { finalAttempt: false }),
    ).rejects.toThrow();

    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  test("the last failed try switches the hook off", async () => {
    post.mockRejectedValue(httpError(500));

    await expect(
      deliverZapierHook(listening(), deliveryJob(), { finalAttempt: true }),
    ).rejects.toThrow();

    expect(db.$executeRaw.mock.calls[0]).toContain(HOOK_A);
  });

  test("a hook unsubscribed while the job waited is skipped", async () => {
    await deliverZapierHook(zapier([]), deliveryJob(), { finalAttempt: false });

    expect(post).not.toHaveBeenCalled();
  });
});

describe("drainLegacyZapierJob", () => {
  test("hands an old queued job to the per-hook deliveries", async () => {
    db.integration.findUnique.mockResolvedValue(
      zapier([{ hookUrl: HOOK_A, subscribed_field: "new_staff_joined_to_team", active: true }]),
    );

    await drainLegacyZapierJob(
      "new_staff_joined_to_team",
      {
        new_staff_joined_to_team: {
          isUser: true,
          name: "Bo",
          email: "bo@example.com",
          team: { name: "Sales", code: "S1" },
        },
      },
      ORG,
    );

    expect(add.mock.calls[0][1].data.payload).toEqual({
      isExistingUser: true,
      name: "Bo",
      email: "bo@example.com",
      teamCode: "S1",
      teamName: "Sales",
    });
  });

  test("drops a job for an org whose Zapier connection is gone", async () => {
    db.integration.findUnique.mockResolvedValue(null);

    await drainLegacyZapierJob("new_contact_create", { new_contact_create: contact }, ORG);

    expect(add).not.toHaveBeenCalled();
  });
});

describe("buildZapierPayload", () => {
  test("an assignment lists each new assignee with their team", async () => {
    db.user.findMany.mockResolvedValue([{ id: "u1", name: "Cy", email: "cy@example.com" }]);
    db.team.findMany.mockResolvedValue([{ id: "t1", name: "Sales", code: "S1" }]);

    const payload = await buildZapierPayload(ZapierTriggers.CONTACT_ASSIGN, {
      contact,
      newAssignees: [{ userId: "u1", teamId: "t1" }],
    });

    expect(payload).toEqual({
      contactId: "c1",
      name: "Ann",
      phone: "919000000001",
      email: "ann@example.com",
      igsId: null,
      assignees: [{ name: "Cy", email: "cy@example.com", teamName: "Sales", teamCode: "S1" }],
    });
  });

  test("a response names its survey by title", async () => {
    const payload = await buildZapierPayload(ZapierTriggers.RESPONSE_SUBMITTED, {
      responses: [{ q: 1 }],
      createdAt: "2026-10-01T00:00:00.000Z",
      language: "en",
      tag: "",
      platform: "WEB",
      deviceData: null,
      contactId: null,
      location: null,
      surveyTeamMap: { survey: { title: "NPS" }, team: { name: "Sales" } },
    });

    expect(payload).toMatchObject({ survey: "NPS", team: "Sales", contactId: null });
  });
});
