import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: { $queryRaw: vi.fn() },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../stats/stats.service.js", () => ({
  incrementMeteredConversationCount: vi.fn(),
}));

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { incrementMeteredConversationCount } from "../../stats/stats.service.js";
import {
  normalizeChannelId,
  recordMessageInWindow,
  WINDOW_DURATION_MS,
} from "./meteredConversation.service.js";

const queryRaw = prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>;
const incrementMock = incrementMeteredConversationCount as unknown as ReturnType<typeof vi.fn>;

const AT = new Date("2026-08-19T10:00:00.000Z");

function input(over: Partial<Parameters<typeof recordMessageInWindow>[0]> = {}) {
  return {
    orgId: "org-1",
    platform: "WHATSAPP" as never,
    channelId: "15551323034",
    customerId: "919188346187",
    contactId: "contact-1",
    at: AT,
    direction: "receive" as const,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recordMessageInWindow — opening a window", () => {
  test("counts usage exactly once, when the INSERT actually created the row", async () => {
    queryRaw.mockResolvedValueOnce([{ id: "mc-1" }]);

    const result = await recordMessageInWindow(input());

    expect(result).toEqual({ conversationId: "mc-1", opened: true });
    expect(incrementMock).toHaveBeenCalledTimes(1);
    expect(incrementMock).toHaveBeenCalledWith("org-1");
    // Only the insert ran — no follow-up UPDATE.
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  test("does NOT count usage when a window was already open", async () => {
    // This is the whole idempotency guarantee: status webhooks for one message fire
    // repeatedly (sent -> delivered -> read) and every extra message folds into the
    // existing window.
    queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "mc-1" }]);

    const result = await recordMessageInWindow(input());

    expect(result).toEqual({ conversationId: "mc-1", opened: false });
    expect(incrementMock).not.toHaveBeenCalled();
  });
});

describe("recordMessageInWindow — the window key", () => {
  test("coalesces a missing channelId to the empty string", async () => {
    // NULL would defeat the unique constraint: Postgres treats NULLs as distinct, so
    // every message from an identifier-less channel would open its own window.
    queryRaw.mockResolvedValueOnce([{ id: "mc-1" }]);

    await recordMessageInWindow(input({ channelId: undefined }));

    const params = queryRaw.mock.calls[0].slice(1);
    expect(params).toContain("");
    expect(params).not.toContain(null);
  });

  test.each([
    ["+1555-132-3034", "15551323034"],
    ["1555-132-3034", "15551323034"],
    ["15551323034", "15551323034"],
    ["+91 79071 37774", "917907137774"],
  ])(
    "keys a WhatsApp window on digits, so %s and its variants share one window",
    async (given, expected) => {
      // The same number arrives in all of these shapes depending on the path — the
      // webhook's metadata, WhatsappSettings.phone, or that value with the plus
      // stripped. Keyed as-is they open a window each, and each one is a counted
      // conversation against the org's allowance.
      queryRaw.mockResolvedValueOnce([{ id: "mc-1" }]);

      await recordMessageInWindow(input({ channelId: given }));

      const params = queryRaw.mock.calls[0].slice(1);
      expect(params).toContain(expected);
      if (given !== expected) expect(params).not.toContain(given);
    },
  );

  test("leaves non-WhatsApp channel ids untouched", () => {
    // Instagram and Facebook ids are opaque; they are digits by coincidence, not
    // because they are phone numbers.
    expect(normalizeChannelId("INSTAGRAM" as never, "17841476126718028")).toBe("17841476126718028");
    expect(normalizeChannelId("WEBCHAT" as never, "web-abc-123")).toBe("web-abc-123");
  });

  test("keeps a digitless WhatsApp channel id rather than collapsing it to empty", () => {
    // "" is the missing-channel key. Mapping a junk value onto it would file those
    // messages in the same window as every identifier-less channel.
    expect(normalizeChannelId("WHATSAPP" as never, "internal")).toBe("internal");
  });

  test("boxes the window at a fixed 24 hours from the first message", async () => {
    queryRaw.mockResolvedValueOnce([{ id: "mc-1" }]);

    await recordMessageInWindow(input());

    const params = queryRaw.mock.calls[0].slice(1);
    const expiresAt = new Date(AT.getTime() + WINDOW_DURATION_MS);
    expect(params).toContainEqual(expiresAt);
    expect(WINDOW_DURATION_MS).toBe(24 * 60 * 60 * 1000);
  });

  test("tracks inbound and outbound separately", async () => {
    queryRaw.mockResolvedValueOnce([{ id: "mc-1" }]);
    await recordMessageInWindow(input({ direction: "receive" }));
    const inbound = queryRaw.mock.calls[0].slice(1);

    queryRaw.mockReset();
    queryRaw.mockResolvedValueOnce([{ id: "mc-2" }]);
    await recordMessageInWindow(input({ direction: "send" }));
    const outbound = queryRaw.mock.calls[0].slice(1);

    // messageCount is the SQL literal 1, so only [inboundCount, outboundCount] are
    // parameterized here; the params after them belong to the NOT EXISTS probe.
    expect(inbound.slice(8, 10)).toEqual([1, 0]);
    expect(outbound.slice(8, 10)).toEqual([0, 1]);
  });
});

describe("recordMessageInWindow — failure handling", () => {
  test("is best-effort: a DB failure logs and returns null instead of throwing", async () => {
    // Metering must never cost a customer their message.
    queryRaw.mockRejectedValueOnce(new Error("db down"));

    await expect(recordMessageInWindow(input())).resolves.toBeNull();
    expect(log.error).toHaveBeenCalled();
    expect(incrementMock).not.toHaveBeenCalled();
  });

  test("returns null when the window expires between the insert probe and the update", async () => {
    queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(recordMessageInWindow(input())).resolves.toBeNull();
    expect(log.warn).toHaveBeenCalled();
    expect(incrementMock).not.toHaveBeenCalled();
  });
});
