import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    orgMember: { findMany: vi.fn() },
    notification: { create: vi.fn() },
  },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
// Keep the mobile-notification SDK out of the import graph for this unit test.
vi.mock("../mobileNotification/mobile.service.js", () => ({ sendPushNotification: vi.fn() }));
vi.mock("../../utils/email/sendAWSEmail.js", () => ({ sendAWSEmail: vi.fn() }));

import { Role } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { notifyConversationLimitReached } from "./notification.service.js";

const membersMock = prisma.orgMember.findMany as unknown as ReturnType<typeof vi.fn>;
const createMock = prisma.notification.create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notifyConversationLimitReached", () => {
  test("targets only active owners/admins of the org", async () => {
    membersMock.mockResolvedValue([]);
    await notifyConversationLimitReached("org-1");

    expect(membersMock).toHaveBeenCalledWith({
      where: {
        orgId: "org-1",
        role: { in: [Role.SUPER_ADMIN, Role.ADMIN] },
        user: { active: true },
      },
      select: { userId: true },
    });
  });

  test("creates one subscription notification per admin with an upgrade message", async () => {
    membersMock.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    createMock.mockResolvedValue({});

    await notifyConversationLimitReached("org-1");

    expect(createMock).toHaveBeenCalledTimes(2);
    const first = createMock.mock.calls[0][0];
    expect(first.data.source).toBe("subscription");
    expect(first.data.subSource).toBe("conversation-limit-reached");
    expect(first.data.data.message).toMatch(/conversation limit/i);
    expect(first.data.orgMember.connect.userId_orgId).toEqual({ userId: "u1", orgId: "org-1" });
  });

  test("is best-effort: swallows errors instead of throwing", async () => {
    membersMock.mockRejectedValue(new Error("db down"));
    await expect(notifyConversationLimitReached("org-1")).resolves.toBeUndefined();
  });
});
