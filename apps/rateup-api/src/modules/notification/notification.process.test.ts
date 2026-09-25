import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { notification: { create: vi.fn() } },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../mobileNotification/mobile.service.js", () => ({
  sendPushNotification: vi.fn(),
  checkPushReceipts: vi.fn(),
}));
vi.mock("../../utils/email/sendAWSEmail.js", () => ({ sendAWSEmail: vi.fn() }));
vi.mock("../../workers/shared/ws.publisher.js", () => ({
  publisher: { publish: vi.fn() },
  WS_CHANNEL: "ws:messages",
}));
vi.mock("../../workers/bullmq/queues/notification.queue.js", () => ({
  notificationQueue: { add: vi.fn(), addBulk: vi.fn() },
}));
vi.mock("./notification.dispatch.js", () => ({ dispatchNotification: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { publisher } from "../../workers/shared/ws.publisher.js";
import { notificationQueue } from "../../workers/bullmq/queues/notification.queue.js";
import { dispatchNotification } from "./notification.dispatch.js";
import { processNotification } from "./notification.service.js";

const create = prisma.notification.create as unknown as ReturnType<typeof vi.fn>;
const publish = publisher.publish as unknown as ReturnType<typeof vi.fn>;
const run = (data: Record<string, unknown>) => processNotification({ id: "1", data } as never);

const catalogued = {
  userId: "u-1",
  orgId: "org-1",
  source: "inbox",
  subSource: "inbox.assigned",
  event: "inbox.assigned",
  data: { contactId: "c-1", contactName: "Ann", path: "/dashboard/inbox?tab=mine&contactId=c-1" },
  title: "Conversation assigned to you",
  body: "Ann was assigned to you.",
  toast: true,
  desktop: true,
  sound: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({ id: "n-1", createdAt: new Date("2026-09-25T10:00:00Z") });
});

describe("processNotification", () => {
  test("an event fans out into one job per channel delivery", async () => {
    vi.mocked(dispatchNotification).mockResolvedValue([{ emailData: { to: "a@b.c" } } as never]);

    await run({ notifyData: { event: "inbox.assigned" } });

    expect(notificationQueue.addBulk).toHaveBeenCalledWith([
      { name: "notification", data: { emailData: { to: "a@b.c" } } },
    ]);
  });

  test("a feed event writes the bell row and tells only that member's sockets", async () => {
    await run({ systemNotificationData: { ...catalogued, feed: true } });

    expect(create.mock.calls[0][0].data).toMatchObject({
      event: "inbox.assigned",
      subSource: "inbox.assigned",
    });
    const [, raw] = publish.mock.calls[0];
    const message = JSON.parse(raw);
    expect(message.userIds).toEqual(["u-1"]);
    expect(message.roleFilter).toBe("main");
    expect(message.data.notification).toMatchObject({
      id: "n-1",
      path: "/dashboard/inbox?tab=mine&contactId=c-1",
      toast: true,
      desktop: true,
      sound: false,
    });
  });

  test("a live-only event writes no row but is still delivered", async () => {
    await run({ systemNotificationData: { ...catalogued, feed: false } });

    expect(create).not.toHaveBeenCalled();
    expect(JSON.parse(publish.mock.calls[0][1]).data.notification.id).toBeNull();
  });

  test("a job from before the catalogue is written to the bell as it always was", async () => {
    await run({
      systemNotificationData: {
        userId: "u-1",
        orgId: "org-1",
        source: "whatsapp",
        subSource: "chat-assigned",
        data: { contactId: "c-1" },
      },
    });

    expect(create).toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });
});
