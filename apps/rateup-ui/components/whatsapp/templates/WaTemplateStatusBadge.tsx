import { Badge } from "@mantine/core";
import { WaTemplateStatus } from "../../../types/enums";

interface WaTemplateStatusBadgeProps {
  status: WaTemplateStatus;
}
const colorMap = {
  [WaTemplateStatus.APPROVED]: "green",
  [WaTemplateStatus.PENDING]: "yellow",
  [WaTemplateStatus.REJECTED]: "red",
}
export default function WaTemplateStatusBadge({ status }: WaTemplateStatusBadgeProps) {
  return (
    <Badge
      color={colorMap[status]}
    >
      {status}
    </Badge>
  )
}