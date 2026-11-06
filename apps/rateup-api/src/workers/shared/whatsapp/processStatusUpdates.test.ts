import { describe, expect, it, vi } from "vitest";

// The module opens Redis, Postgres and a Meta client at import; none of that
// is needed for a pure merge function.
vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../../utils/db.js", () => ({ default: { connect: vi.fn() } }));
vi.mock("../ws.publisher.js", () => ({ publisher: { publish: vi.fn() }, WS_CHANNEL: "ws" }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: { duplicate: () => ({}) } }));
vi.mock("../../../modules/whatsapp/meta/metaMessage.service.js", () => ({
  sendMetaMessage: vi.fn(),
  metaErrorMessage: vi.fn(),
}));

const { processStatusUpdates } = await import("./index.js");

const empty = () => ({ read: "", sent: "", failed: "", delivered: "" });

describe("processStatusUpdates", () => {
  it("advances through the funnel when receipts arrive in order", () => {
    expect(processStatusUpdates(empty(), { sent: "t1" }).newStatus).toBe("SENT");
    expect(processStatusUpdates({ ...empty(), sent: "t1" }, { delivered: "t2" }).newStatus).toBe(
      "DELIVERED",
    );
    expect(
      processStatusUpdates({ ...empty(), sent: "t1", delivered: "t2" }, { read: "t3" }).newStatus,
    ).toBe("READ");
  });

  // Meta posts each status as its own webhook and the API handles them
  // concurrently, so `sent` regularly reaches the topic after `read`.
  it("does not move a READ message back to SENT when a late `sent` arrives", () => {
    const stored = { sent: "t1", delivered: "t2", read: "t3", failed: "" };
    const { stats, newStatus } = processStatusUpdates(stored, { sent: "t0" });
    expect(newStatus).toBe("READ");
    // First write wins on the timestamp too.
    expect(stats.sent).toBe("t1");
  });

  it("does not hide a failure behind a late `sent`", () => {
    const stored = { sent: "t1", delivered: "", read: "", failed: "t2" };
    expect(processStatusUpdates(stored, { sent: "t0" }).newStatus).toBe("FAILED");
  });

  it("does not move a READ message back to DELIVERED when `delivered` is late", () => {
    const stored = { sent: "t1", delivered: "", read: "t3", failed: "" };
    expect(processStatusUpdates(stored, { delivered: "t2" }).newStatus).toBe("READ");
  });

  it("still fails a message that was sent and then failed", () => {
    const stored = { sent: "t1", delivered: "", read: "", failed: "" };
    expect(processStatusUpdates(stored, { failed: "t2" }).newStatus).toBe("FAILED");
  });

  it("keeps COMPLETED on top, from either spelling", () => {
    const stored = { sent: "t1", delivered: "t2", read: "t3", failed: "" };
    expect(processStatusUpdates(stored, { complete: "t4" }).newStatus).toBe("COMPLETED");
    expect(processStatusUpdates({ ...stored, completed: "t4" }, {}).newStatus).toBe("COMPLETED");
  });

  it("returns no status when nothing is known", () => {
    expect(processStatusUpdates(empty(), {}).newStatus).toBe("");
  });
});
