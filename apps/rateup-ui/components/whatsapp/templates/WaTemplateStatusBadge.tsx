import { Badge } from "@mantine/core";

import { WaTemplateStatus } from "../../../types/enums";

interface WaTemplateStatusBadgeProps {
  status: WaTemplateStatus;
  defaultType?: boolean;
}
const colorMap = {
  [WaTemplateStatus.APPROVED]: "green",
  [WaTemplateStatus.PENDING]: "yellow",
  [WaTemplateStatus.REJECTED]: "red",
  [WaTemplateStatus.DRAFT]: "blue",
};
export default function WaTemplateStatusBadge({
  status,
  defaultType = false,
}: WaTemplateStatusBadgeProps) {
  return (
    <Badge
      color={defaultType ? "var(--tertiary-color)" : colorMap[status]}
      variant="light"
      radius={8}
      h={20}
    >
      {status}
    </Badge>
  );
}
