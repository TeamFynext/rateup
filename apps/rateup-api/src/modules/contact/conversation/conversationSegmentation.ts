import { CloseReason, InboxStatus, WaMessageAssignStatus } from "../../../types/enums.js";
import { isTerminalInboxStatus, TerminalInboxStatus } from "../../whatsapp/constants.js";

/// Pure session segmentation: given a contact's full message history, decide
/// where one conversation session ends and the next begins. Used by the
/// backfill to reconstruct historical sessions the way the live lifecycle
/// (`getOrOpenConversation` / auto-close automation) would have produced them.
///
/// Two kinds of boundary, in precedence order:
///   1. an internal close marker ("marked this chat as closed", spam, resolved
///      ...) closes the running session at the marker's own timestamp with the
///      marker's attribution — a *real* close;
///   2. an inactivity gap longer than the org's auto-close threshold closes it
///      the way the automation cron would have: at `last activity + threshold`,
///      attributed to automation — a *synthetic* close.
///
/// INTERNAL messages (assign markers, private notes) travel with the session
/// they narrate but never move the inbox clock: gaps are measured between
/// non-INTERNAL messages, matching `Conversation.lastMessageAt` semantics.

export interface SegmentableMessage {
  id: string;
  /// waCreatedAt ?? createdAt of the WaMessage.
  at: Date;
  sendBy: string | null;
  /// sourcePlatform === INTERNAL (system markers, private notes).
  isInternal: boolean;
  /// For internal close markers: the terminal status the marker recorded
  /// (`messageBody.internal.assignStatus`), else null/undefined.
  closeMarkerStatus?: string | null;
  /// `messageBody.internal.triggeredByUser.id` — null for "RateUp"/"Automation".
  closeMarkerBy?: string | null;
  /// True when the marker was triggered by "RateUp"/"Automation".
  closeMarkerByAutomation?: boolean;
}

export interface SegmentClose {
  at: Date;
  by: string | null;
  status: TerminalInboxStatus;
  reason: CloseReason;
  byAutomation: boolean;
  /// True for gap-inferred closes, false for close-marker closes.
  synthetic: boolean;
}

export interface SessionSegment {
  messageIds: string[];
  firstAt: Date;
  /// Non-INTERNAL activity window (null when the segment is markers-only).
  lastMessageAt: Date | null;
  lastAgentMessageAt: Date | null;
  lastCustomerMessageAt: Date | null;
  firstAgentMessageAt: Date | null;
  /// Non-INTERNAL message count, matching `addNewWaMessage`.
  messageCount: number;
  /// Null means the segment is still open when the input ends.
  close: SegmentClose | null;
}

const HOUR_MS = 60 * 60 * 1000;

function isCloseMarker(m: SegmentableMessage): boolean {
  return Boolean(
    m.isInternal && m.closeMarkerStatus && isTerminalInboxStatus(m.closeMarkerStatus as InboxStatus),
  );
}

function markerClose(m: SegmentableMessage): SegmentClose {
  const status = m.closeMarkerStatus as TerminalInboxStatus;
  return {
    at: m.at,
    by: m.closeMarkerBy ?? null,
    status,
    reason:
      status === WaMessageAssignStatus.SPAM
        ? CloseReason.SPAM
        : m.closeMarkerByAutomation
          ? CloseReason.AUTOMATION_IDLE
          : CloseReason.MANUAL,
    byAutomation: Boolean(m.closeMarkerByAutomation),
    synthetic: false,
  };
}

function syntheticClose(anchor: Date, gapHours: number): SegmentClose {
  return {
    at: new Date(anchor.getTime() + gapHours * HOUR_MS),
    by: null,
    status: WaMessageAssignStatus.CLOSED as TerminalInboxStatus,
    reason: CloseReason.AUTOMATION_IDLE,
    byAutomation: true,
    synthetic: true,
  };
}

interface RunningSegment {
  messages: SegmentableMessage[];
  /// Last non-INTERNAL timestamp — the gap anchor. Falls back to the first
  /// message's time for markers-only segments.
  anchor: Date;
}

function finalize(run: RunningSegment, close: SegmentClose | null): SessionSegment {
  const counted = run.messages.filter((m) => !m.isInternal);
  const agent = counted.filter((m) => m.sendBy);
  const customer = counted.filter((m) => !m.sendBy);
  const maxAt = (list: SegmentableMessage[]) =>
    list.length ? list.reduce((a, b) => (a.at >= b.at ? a : b)).at : null;
  return {
    messageIds: run.messages.map((m) => m.id),
    firstAt: run.messages[0].at,
    lastMessageAt: maxAt(counted),
    lastAgentMessageAt: maxAt(agent),
    lastCustomerMessageAt: maxAt(customer),
    firstAgentMessageAt: agent.length ? agent[0].at : null,
    messageCount: counted.length,
    close,
  };
}

/**
 * Splits a message history into session segments.
 *
 * @param messages   the contact's messages; sorted ascending internally.
 * @param gapHours   the org's auto-close threshold (default 24).
 * @param now        "current time" for deciding whether the tail segment is
 *                   still open; injectable for tests.
 */
export function segmentMessagesIntoSessions(
  messages: SegmentableMessage[],
  gapHours: number = 24,
  now: Date = new Date(),
): SessionSegment[] {
  const ordered = [...messages].sort((a, b) => a.at.getTime() - b.at.getTime());
  const segments: SessionSegment[] = [];
  let run: RunningSegment | null = null;

  for (const m of ordered) {
    if (run && m.at.getTime() - run.anchor.getTime() > gapHours * HOUR_MS) {
      // The session went idle long enough that the automation would have
      // closed it before this message arrived.
      segments.push(finalize(run, syntheticClose(run.anchor, gapHours)));
      run = null;
    }

    if (!run) {
      run = { messages: [m], anchor: m.at };
    } else {
      run.messages.push(m);
    }
    if (!m.isInternal) run.anchor = m.at;

    if (isCloseMarker(m)) {
      segments.push(finalize(run, markerClose(m)));
      run = null;
    }
  }

  if (run) {
    const idle = now.getTime() - run.anchor.getTime() > gapHours * HOUR_MS;
    segments.push(finalize(run, idle ? syntheticClose(run.anchor, gapHours) : null));
  }

  return segments;
}
