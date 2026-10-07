import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({ default: { waCall: { findUnique: vi.fn() } } }));
vi.mock("../../../utils/redisConnection.js", () => ({
  default: { set: vi.fn(), exists: vi.fn() },
}));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), error: vi.fn() } }));
vi.mock("../settings/wa_settings.service.js", () => ({ getWaSettingsByPhoneId: vi.fn() }));
vi.mock("../wa_axios.js", () => ({ callMetaApi: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { getWaSettingsByPhoneId } from "../settings/wa_settings.service.js";
import { callMetaApi } from "../wa_axios.js";
import { checkCallAlive, holdsBrowserMedia } from "./calling.watchdog.js";

const live = {
  id: "call-1",
  phoneId: "1027759703761684",
  waCallId: "wacid.ABC",
  direction: "USER_INITIATED",
  status: "ACCEPTED",
  endedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getWaSettingsByPhoneId).mockResolvedValue({ accessToken: "token" } as never);
});

describe("checkCallAlive", () => {
  test("leaves a call alone while its browser keeps beating", async () => {
    vi.mocked(prisma.waCall.findUnique).mockResolvedValue(live as never);
    vi.mocked(redis.exists).mockResolvedValue(1);

    expect(await checkCallAlive("call-1")).toBe("alive");
    expect(callMetaApi).not.toHaveBeenCalled();
  });

  test("hangs up on Meta once the beats stop", async () => {
    vi.mocked(prisma.waCall.findUnique).mockResolvedValue(live as never);
    vi.mocked(redis.exists).mockResolvedValue(0);

    expect(await checkCallAlive("call-1")).toBe("terminated");
    expect(callMetaApi).toHaveBeenCalledWith(`/${live.phoneId}/calls`, "POST", "token", {
      messaging_product: "whatsapp",
      call_id: "wacid.ABC",
      action: "terminate",
    });
  });

  test("stops watching a call that already ended", async () => {
    vi.mocked(prisma.waCall.findUnique).mockResolvedValue({
      ...live,
      status: "COMPLETED",
      endedAt: new Date(),
    } as never);

    expect(await checkCallAlive("call-1")).toBe("gone");
    expect(redis.exists).not.toHaveBeenCalled();
  });

  test("a Meta refusal still ends the watch", async () => {
    vi.mocked(prisma.waCall.findUnique).mockResolvedValue(live as never);
    vi.mocked(redis.exists).mockResolvedValue(0);
    vi.mocked(callMetaApi).mockRejectedValue(new Error("already ended"));

    expect(await checkCallAlive("call-1")).toBe("terminated");
  });
});

describe("holdsBrowserMedia", () => {
  test.each([
    [{ status: "ACCEPTED", direction: "USER_INITIATED", endedAt: null }, true],
    [{ status: "RINGING", direction: "BUSINESS_INITIATED", endedAt: null }, true],
    [{ status: "RINGING", direction: "USER_INITIATED", endedAt: null }, false],
    [{ status: "ACCEPTED", direction: "USER_INITIATED", endedAt: new Date() }, false],
  ])("%o → %s", (call, expected) => {
    expect(holdsBrowserMedia(call as never)).toBe(expected);
  });
});
