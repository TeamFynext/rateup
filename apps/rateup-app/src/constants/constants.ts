import { WaMessageAssignStatus } from "../api/inbox/types";

export const WaMessageClosedStatus = [
  WaMessageAssignStatus.CLOSED,
  WaMessageAssignStatus.SPAM,
  WaMessageAssignStatus.RESOLVED,
  WaMessageAssignStatus.UNRESOLVED,
];

export const colors = {
  "primary-blue": "#1873E8",
  "gray-700": "#374151",
  "gray-100": "#F3F4F6",
  "gray-50": "#F9FAFB",
  "gray-900": "#091522",
  "light-blue": "#E3F2FD",
  "amber-500": "#f59e0b",
  "chat-bubble-green": "#d2f8d2",
  "slate-950": "#091522",
  "status-resolved": "#16A34A",
  "status-unresolved": "#EA580C",
  "status-closed": "#2563EB",
  "status-spam": "#DC2626",
  "status-default": "#4F46E5",
};
