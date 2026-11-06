import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { $transaction: vi.fn(), notificationSetting: { findFirst: vi.fn() } },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../mobileNotification/mobile.service.js", () => ({ sendPushNotification: vi.fn() }));
vi.mock("../../utils/email/sendAWSEmail.js", () => ({ sendAWSEmail: vi.fn() }));
vi.mock("../../utils/email/payments/usageLimitAlert.js", () => ({
  sendUsageLimitMailAlert: vi.fn(),
}));
vi.mock("./notify.js", () => ({ notify: vi.fn() }));

import prisma from "../../utils/prisma.js";
import type { Actor } from "../../authz/actor.js";
import { updateNotificationSettings } from "./notification.service.js";

// oxlint-disable-next-line typescript/no-explicit-any
const db = prisma as any;
const actor = { userId: "u-1", orgId: "org-1", can: () => true } as unknown as Actor;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

let stored: Record<string, unknown> | null;
let lockSql: string[];

/** A transaction whose `FOR … UPDATE` query holds a lock until the transaction ends, as Postgres does. */
function fakeTransactions() {
  let lock: Promise<void> = Promise.resolve();
  db.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const tx = {
      $queryRaw: async (strings: TemplateStringsArray) => {
        const sql = strings.join("?");
        lockSql.push(sql);
        if (/FOR (NO KEY )?UPDATE/.test(sql)) {
          const previous = lock;
          lock = held;
          await previous;
        }
        return [{ id: "member-1" }];
      },
      notificationSetting: {
        findUnique: async () => {
          await tick();
          return stored;
        },
        upsert: async ({ create, update }: { create: object; update: object }) => {
          await tick();
          stored = stored ? { ...stored, ...update } : { ...create };
        },
      },
    };
    try {
      return await fn(tx);
    } finally {
      release();
    }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  stored = null;
  lockSql = [];
  fakeTransactions();
  db.notificationSetting.findFirst.mockImplementation(async () => stored);
});

describe("updateNotificationSettings", () => {
  test("two first-time saves at once both land, neither overwriting the other", async () => {
    await Promise.all([
      updateNotificationSettings(actor, { channels: { push: false } }),
      updateNotificationSettings(actor, { sound: false }),
    ]);

    expect(lockSql[0]).toMatch(/FROM "OrgMember"[\s\S]*FOR NO KEY UPDATE/);
    expect(stored).toMatchObject({ orgMemberId: "member-1", push: false, sound: false });
  });
});
