import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    expoPushToken: { findMany: vi.fn() },
    voipPushToken: { findMany: vi.fn() },
  },
}));
vi.mock("../../../utils/redisConnection.js", () => ({ default: { set: vi.fn() } }));
vi.mock("../../../utils/logger.js", () => ({ log: { error: vi.fn() } }));
vi.mock("../../mobileNotification/mobile.service.js", () => ({ sendPushNotification: vi.fn() }));
vi.mock("../../mobileNotification/apns.js", () => ({
  sendVoipPush: vi.fn(),
  voipPushConfigured: vi.fn(),
}));

import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import { sendPushNotification } from "../../mobileNotification/mobile.service.js";
import { sendVoipPush, voipPushConfigured } from "../../mobileNotification/apns.js";
import { pushCallStoppedRinging, pushIncomingCall } from "./calling.push.js";

const input = {
  orgId: "org-1",
  callId: "call-1",
  contactId: "contact-1",
  callerName: "Asha",
  handle: "919800000000",
  userIds: ["agent-1", "agent-2"],
};
const data = { type: "wa_call", callId: "call-1", contactId: "contact-1", callerName: "Asha" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(voipPushConfigured).mockReturnValue(true);
  vi.mocked(prisma.voipPushToken.findMany).mockResolvedValue([]);
});

describe("pushIncomingCall", () => {
  test("wakes Android with a data-only push and rings iOS through CallKit", async () => {
    vi.mocked(prisma.expoPushToken.findMany).mockResolvedValue([
      { expoToken: "ExponentPushToken[android]", platform: "android", userId: "agent-1" },
      { expoToken: "ExponentPushToken[ios]", platform: "ios", userId: "agent-2" },
    ] as never);
    vi.mocked(prisma.voipPushToken.findMany).mockResolvedValue([
      { token: "a1b2", userId: "agent-2" },
    ] as never);

    await pushIncomingCall(input);

    expect(sendPushNotification).toHaveBeenCalledTimes(1);
    expect(sendPushNotification).toHaveBeenCalledWith(
      ["ExponentPushToken[android]"],
      "",
      "",
      data,
      { dataOnly: true, priority: "high", ttl: 45 },
    );
    // The iOS phone already rings through CallKit, so it gets no second notification.
    expect(sendVoipPush).toHaveBeenCalledWith(
      ["a1b2"],
      { uuid: "call-1", handle: "919800000000", ...data },
      45,
    );
  });

  test("falls back to the ringtone notification where CallKit cannot ring", async () => {
    vi.mocked(voipPushConfigured).mockReturnValue(false);
    vi.mocked(prisma.expoPushToken.findMany).mockResolvedValue([
      { expoToken: "ExponentPushToken[ios]", platform: "ios", userId: "agent-2" },
      { expoToken: "ExponentPushToken[old]", platform: null, userId: "agent-1" },
    ] as never);

    await pushIncomingCall(input);

    expect(prisma.voipPushToken.findMany).not.toHaveBeenCalled();
    expect(sendPushNotification).toHaveBeenCalledWith(
      ["ExponentPushToken[ios]", "ExponentPushToken[old]"],
      "Incoming WhatsApp call",
      "Asha",
      data,
      {
        sound: "wa_call_ringtone.wav",
        channelId: "wa_calls",
        priority: "high",
        ttl: 45,
        interruptionLevel: "time-sensitive",
      },
    );
  });

  test("a push failure is logged, never thrown into the call flow", async () => {
    vi.mocked(prisma.expoPushToken.findMany).mockRejectedValue(new Error("db down"));
    await expect(pushIncomingCall(input)).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalled();
  });
});

describe("pushCallStoppedRinging", () => {
  test("clears the ring on Android phones once per call", async () => {
    vi.mocked(redis.set).mockResolvedValue("OK" as never);
    vi.mocked(prisma.expoPushToken.findMany).mockResolvedValue([
      { expoToken: "ExponentPushToken[android]" },
    ] as never);

    await pushCallStoppedRinging({ orgId: "org-1", callId: "call-1", userIds: ["agent-1"] });

    expect(prisma.expoPushToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ platform: "android" }) }),
    );
    expect(sendPushNotification).toHaveBeenCalledWith(
      ["ExponentPushToken[android]"],
      "",
      "",
      { type: "wa_call_stop", callId: "call-1" },
      { dataOnly: true, priority: "high", ttl: 45 },
    );
  });

  test("sends nothing the second time", async () => {
    vi.mocked(redis.set).mockResolvedValue(null as never);
    await pushCallStoppedRinging({ orgId: "org-1", callId: "call-1", userIds: ["agent-1"] });
    expect(sendPushNotification).not.toHaveBeenCalled();
  });
});
