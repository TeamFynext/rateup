import type { InboxStatus } from "../../types/enums.js";
import { WaMessageAssignStatus } from "../../types/enums.js";

const whatsappApiBaseUrl = "https://graph.facebook.com/v21.0";

export { whatsappApiBaseUrl };

export const WaMessageAssignStatusTab = {
  New: "NEW",
  UnAssigned: "UNASSIGNED",
  Assigned: "ASSIGNED",
  Closed: "CLOSED",
  mine: "ASSIGNED",
  Addressed: "ADDRESSED", // implies group of status => WaMessageClosedStatus
};

/// The terminal statuses: reaching any of them closes the conversation.
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
