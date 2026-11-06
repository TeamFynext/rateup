import { beforeEach, describe, expect, test, vi } from "vitest";

// conversationStatusData / resolveInboxActor are pure, but the module imports
// prisma and sibling services at load time; stub prisma so no DB is touched.
vi.mock("../../../utils/prisma.js", () => ({ default: {} }));

import { CloseReason, WaMessageAssignStatus } from "../../../types/enums.js";
import { conversationStatusData, resolveInboxActor } from "./conversation.service.js";

const USER_ID = "123e4567-e89b-12d3-a456-426614174000";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("conversationStatusData — reopen (non-terminal status)", () => {
  test("clears every close/resolution stamp so the successor starts clean", () => {
    const data = conversationStatusData(WaMessageAssignStatus.ASSIGNED, {
      source: "user",
      userId: USER_ID,
    });

    expect(data.status).toBe(WaMessageAssignStatus.ASSIGNED);
    expect(data.closedAt).toBeNull();
    expect(data.closedBy).toBeNull();
    expect(data.resolvedAt).toBeNull();
    expect(data.closeReason).toBeNull();
    expect(data.closedByAutomation).toBe(false);
  });
});

describe("conversationStatusData — terminal close", () => {
  test("RESOLVED by a user stamps closedAt + resolvedAt and attributes the user", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const data = conversationStatusData(
      WaMessageAssignStatus.RESOLVED,
      { source: "user", userId: USER_ID },
      undefined,
      now,
    );

    expect(data.status).toBe(WaMessageAssignStatus.RESOLVED);
    expect(data.closedAt).toBe(now);
    expect(data.resolvedAt).toBe(now);
    expect(data.closedBy).toBe(USER_ID);
    expect(data.closeReason).toBe(CloseReason.MANUAL);
    expect(data.closedByAutomation).toBe(false);
  });

  test("CLOSED by automation has no closedBy, no resolvedAt, and an automation reason", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const data = conversationStatusData(
      WaMessageAssignStatus.CLOSED,
      { source: "automation" },
      undefined,
      now,
    );

    expect(data.status).toBe(WaMessageAssignStatus.CLOSED);
    expect(data.closedAt).toBe(now);
    expect(data.resolvedAt).toBeNull(); // only RESOLVED sets resolvedAt
    expect(data.closedBy).toBeNull(); // non-human actor
    expect(data.closeReason).toBe(CloseReason.AUTOMATION_IDLE);
    expect(data.closedByAutomation).toBe(true);
  });

  test("an explicit closeReason overrides the derived one", () => {
    const data = conversationStatusData(
      WaMessageAssignStatus.CLOSED,
      { source: "user", userId: USER_ID },
      CloseReason.SPAM,
    );
    expect(data.closeReason).toBe(CloseReason.SPAM);
  });
});

describe("resolveInboxActor", () => {
  test("maps a real uuid to a user actor", () => {
    expect(resolveInboxActor(USER_ID)).toEqual({ source: "user", userId: USER_ID });
  });

  test("maps sentinels and undefined to a system actor", () => {
    expect(resolveInboxActor("RateUp")).toEqual({ source: "system" });
    expect(resolveInboxActor(undefined)).toEqual({ source: "system" });
  });
});
