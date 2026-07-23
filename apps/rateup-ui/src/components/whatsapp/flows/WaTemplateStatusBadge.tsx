import { Badge } from "@/components/ui/badge.tsx";
import { WaFlowStatus } from "@/types/enums.ts";

interface WaFlowStatusBadgleProps {
  status: WaFlowStatus;
}
const AMBER = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500";
const RED = "bg-destructive/10 text-destructive";
const classMap = {
  [WaFlowStatus.PUBLISHED]: "bg-green-600/10 text-green-600 dark:text-green-500",
  [WaFlowStatus.DRAFT]: AMBER,
  [WaFlowStatus.BLOCKED]: RED,
  [WaFlowStatus.DEPRECATED]: RED,
  [WaFlowStatus.THROTTLED]: AMBER,
};
export default function WaFlowStatusBadge({ status }: WaFlowStatusBadgleProps) {
  return <Badge className={classMap[status]}>{status}</Badge>;
}
