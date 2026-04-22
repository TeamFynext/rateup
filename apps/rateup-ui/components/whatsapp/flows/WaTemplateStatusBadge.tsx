import { Badge } from "@mantine/core";

import { WaFlowStatus } from "../../../types/enums";

interface WaFlowStatusBadgleProps {
  status: WaFlowStatus;
}
const colorMap = {
  [WaFlowStatus.PUBLISHED]: "green",
  [WaFlowStatus.DRAFT]: "yellow",
  [WaFlowStatus.BLOCKED]: "red",
  [WaFlowStatus.DEPRECATED]: "red",
  [WaFlowStatus.THROTTLED]: "yellow",
};
export default function WaFlowStatusBadge({ status }: WaFlowStatusBadgleProps) {
  return <Badge color={colorMap[status]}>{status}</Badge>;
}
