import type { InboxStatus } from "../../types/enums.js";
import { WaMessageAssignStatus } from "../../types/enums.js";

export const WaMessageAssignStatusTab = {
  New: "NEW",
  UnAssigned: "UNASSIGNED",
  Assigned: "ASSIGNED",
  Closed: "CLOSED",
  mine: "ASSIGNED",
  Addressed: "ADDRESSED", // implies group of status => WaMessageClosedStatus
};

/// Spam is a flag on the contact (`Contact.isSpam`), not a status, so neither
/// marking nor unmarking has an `InboxStatus` to name it. "NOT_SPAM" exists only
/// as an internal-message *event* label (see `InboxEventLabel`); "SPAM" is still
/// written as an event label, but never as a stored status.
export const NOT_SPAM_EVENT = "NOT_SPAM";

/// The terminal statuses: reaching any of them closes the conversation.
/// SPAM is deprecated as a stored status (spam moved onto the contact) but stays
/// in the list so any row written before the migration still reads as closed.
export type TerminalInboxStatus = Extract<
  InboxStatus,
  "CLOSED" | "SPAM" | "RESOLVED" | "UNRESOLVED"
>;

export const WaMessageClosedStatus: readonly InboxStatus[] = [
  WaMessageAssignStatus.CLOSED,
  WaMessageAssignStatus.SPAM,
  WaMessageAssignStatus.RESOLVED,
  WaMessageAssignStatus.UNRESOLVED,
];

export function isTerminalInboxStatus(status: InboxStatus): status is TerminalInboxStatus {
  return WaMessageClosedStatus.includes(status);
}
