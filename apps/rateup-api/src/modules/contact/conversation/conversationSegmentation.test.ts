import { describe, expect, it } from "vitest";
import {
  SegmentableMessage,
  segmentMessagesIntoSessions,
} from "./conversationSegmentation.js";

const T0 = new Date("2026-01-01T10:00:00Z");
const hours = (n: number) => new Date(T0.getTime() + n * 60 * 60 * 1000);

let seq = 0;
function msg(overrides: Partial<SegmentableMessage> & { at: Date }): SegmentableMessage {
  return {
    id: `m${++seq}`,
    sendBy: null,
    isInternal: false,
    ...overrides,
  };
}

const inbound = (at: Date) => msg({ at });
const outbound = (at: Date, sendBy = "agent-1") => msg({ at, sendBy });
const closeMarker = (at: Date, by: string | null = "agent-1", status = "CLOSED") =>
  msg({
    at,
    isInternal: true,
    sendBy: by,
    closeMarkerStatus: status,
    closeMarkerBy: by,
    closeMarkerByAutomation: by === null,
  });
const assignMarker = (at: Date) =>
  msg({ at, isInternal: true, sendBy: "agent-1", closeMarkerStatus: "ASSIGNED" });

describe("segmentMessagesIntoSessions", () => {
  it("returns no segments for no messages", () => {
    expect(segmentMessagesIntoSessions([], 24, hours(0))).toEqual([]);
  });

  it("keeps an active thread as a single open segment", () => {
    const segments = segmentMessagesIntoSessions(
      [inbound(hours(0)), outbound(hours(1)), inbound(hours(2))],
      24,
      hours(3),
    );
    expect(segments).toHaveLength(1);
    expect(segments[0].close).toBeNull();
    expect(segments[0].messageCount).toBe(3);
    expect(segments[0].firstAgentMessageAt).toEqual(hours(1));
    expect(segments[0].lastCustomerMessageAt).toEqual(hours(2));
  });

  it("splits at a close marker and keeps the marker in the closed segment", () => {
    const marker = closeMarker(hours(2));
    const segments = segmentMessagesIntoSessions(
      [inbound(hours(0)), outbound(hours(1)), marker, inbound(hours(3))],
      24,
      hours(4),
    );
    expect(segments).toHaveLength(2);
    expect(segments[0].messageIds).toContain(marker.id);
    expect(segments[0].close).toMatchObject({
      at: hours(2),
      by: "agent-1",
      status: "CLOSED",
      reason: "MANUAL",
      byAutomation: false,
      synthetic: false,
    });
    // markers don't count toward message metrics
    expect(segments[0].messageCount).toBe(2);
    expect(segments[1].close).toBeNull();
    expect(segments[1].firstAt).toEqual(hours(3));
  });

  it("splits at an inactivity gap with a synthetic automation close", () => {
    const segments = segmentMessagesIntoSessions(
      [inbound(hours(0)), inbound(hours(1)), inbound(hours(30))],
      24,
      hours(31),
    );
    expect(segments).toHaveLength(2);
    expect(segments[0].close).toMatchObject({
      at: hours(25), // last activity (h1) + 24h threshold
      status: "CLOSED",
      reason: "AUTOMATION_IDLE",
      byAutomation: true,
      synthetic: true,
    });
    expect(segments[1].close).toBeNull();
  });

  it("closes the tail segment when it has been idle past the threshold", () => {
    const segments = segmentMessagesIntoSessions([inbound(hours(0))], 24, hours(48));
    expect(segments).toHaveLength(1);
    expect(segments[0].close).toMatchObject({ synthetic: true, at: hours(24) });
  });

  it("combines marker and gap boundaries", () => {
    const segments = segmentMessagesIntoSessions(
      [
        inbound(hours(0)),
        closeMarker(hours(1)), // real close -> segment 1
        inbound(hours(2)), // reopen -> segment 2
        inbound(hours(40)), // >24h gap -> closes segment 2, opens segment 3
      ],
      24,
      hours(41),
    );
    expect(segments).toHaveLength(3);
    expect(segments[0].close?.synthetic).toBe(false);
    expect(segments[1].close).toMatchObject({ synthetic: true, at: hours(26) });
    expect(segments[2].close).toBeNull();
  });

  it("attributes automation close markers to automation", () => {
    const segments = segmentMessagesIntoSessions(
      [inbound(hours(0)), closeMarker(hours(25), null)],
      48, // wide threshold so only the marker splits
      hours(26),
    );
    expect(segments).toHaveLength(1);
    expect(segments[0].close).toMatchObject({
      by: null,
      byAutomation: true,
      reason: "AUTOMATION_IDLE",
      synthetic: false,
    });
  });

  it("treats spam markers as spam closes", () => {
    const segments = segmentMessagesIntoSessions(
      [inbound(hours(0)), closeMarker(hours(1), "agent-1", "SPAM")],
      24,
      hours(2),
    );
    expect(segments[0].close).toMatchObject({ status: "SPAM", reason: "SPAM" });
  });

  it("does not treat assign markers as boundaries and excludes them from gap anchoring", () => {
    const segments = segmentMessagesIntoSessions(
      [
        inbound(hours(0)),
        assignMarker(hours(1)),
        // 23h after the last real message but 22h after the marker: still
        // inside the threshold measured against real activity? No: 23h < 24h.
        inbound(hours(23)),
        // marker at h30 must NOT extend the session: gap anchor stays h23,
        // so the message at h60 is beyond h23+24h and opens a new session.
        assignMarker(hours(30)),
        inbound(hours(60)),
      ],
      24,
      hours(61),
    );
    expect(segments).toHaveLength(2);
    expect(segments[0].messageIds).toHaveLength(4);
    expect(segments[0].close).toMatchObject({ synthetic: true, at: hours(47) });
    expect(segments[1].firstAt).toEqual(hours(60));
  });

  it("sorts unordered input before segmenting", () => {
    const segments = segmentMessagesIntoSessions(
      [inbound(hours(2)), inbound(hours(0)), outbound(hours(1))],
      24,
      hours(3),
    );
    expect(segments).toHaveLength(1);
    expect(segments[0].firstAt).toEqual(hours(0));
    expect(segments[0].lastMessageAt).toEqual(hours(2));
  });

  it("counts only non-internal messages in metrics but links all ids", () => {
    const segments = segmentMessagesIntoSessions(
      [inbound(hours(0)), assignMarker(hours(1)), outbound(hours(2))],
      24,
      hours(3),
    );
    expect(segments[0].messageCount).toBe(2);
    expect(segments[0].messageIds).toHaveLength(3);
  });
});
