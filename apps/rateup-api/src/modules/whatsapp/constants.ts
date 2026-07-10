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

export const WaMessageClosedStatus = [
  WaMessageAssignStatus.CLOSED,
  WaMessageAssignStatus.SPAM,
  WaMessageAssignStatus.RESOLVED,
  WaMessageAssignStatus.UNRESOLVED,
];
