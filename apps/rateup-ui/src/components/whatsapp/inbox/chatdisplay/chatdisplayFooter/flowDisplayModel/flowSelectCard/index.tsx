import { Badge } from "@/components/ui/badge.tsx";
import { FieldLabel } from "@/components/ui/field.tsx";
import { RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { cn } from "@/lib/utils.ts";

export default function WaInboxFlowSelectCard(props: DbFlow & { selected?: boolean }) {
  return (
    <FieldLabel
      htmlFor={props.dbFlowId}
      className={cn(
        "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all hover:bg-muted/50 mb-2",
        props.selected ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <div className="flex items-center gap-2.5">
        <RadioGroupItem value={props.dbFlowId} id={props.dbFlowId} />
        <span className="text-xs font-medium select-none">{props?.name}</span>
      </div>
      <div>
        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
          {props?.status}
        </Badge>
      </div>
    </FieldLabel>
  );
}
