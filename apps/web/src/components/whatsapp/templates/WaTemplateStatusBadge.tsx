import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils";
import { WaTemplateStatus } from "@/types/enums.ts";

interface WaTemplateStatusBadgeProps {
  status: WaTemplateStatus;
  defaultType?: boolean;
  className?: string;
}
const classMap = {
  [WaTemplateStatus.APPROVED]: "bg-green-600/10 text-green-600 dark:text-green-500",
  [WaTemplateStatus.PENDING]: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
  [WaTemplateStatus.REJECTED]: "bg-destructive/10 text-destructive",
  [WaTemplateStatus.DRAFT]: "bg-ru-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
};
export default function WaTemplateStatusBadge({
  status,
  defaultType = false,
  className,
}: Readonly<WaTemplateStatusBadgeProps>) {
  return (
    <Badge
      className={cn(
        "h-5 rounded-lg",
        defaultType ? "bg-muted text-muted-foreground" : classMap[status],
        className,
      )}
    >
      {status}
    </Badge>
  );
}
