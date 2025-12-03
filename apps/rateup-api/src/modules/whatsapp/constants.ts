import { WaMessageAssignStatus } from "../../types/enums";

const whatsappApiBaseUrl = "https://graph.facebook.com/v21.0";

export { whatsappApiBaseUrl };

export const WaMessageAssignStatusTab = {
  New: "NEW",
  UnAssigned: "UNASSIGNED",
  Assigned: "ASSIGNED",
  Closed: "CLOSED",
  mine: "ASSIGNED",
};

export const WaMessageClosedStatus = [
  WaMessageAssignStatus.CLOSED,
  WaMessageAssignStatus.SPAM,
  WaMessageAssignStatus.RESOLVED,
  WaMessageAssignStatus.UNRESOLVED,
];
