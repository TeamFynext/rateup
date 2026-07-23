import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WaFlowStatus } from "@/types/enums.ts";

interface FlowSelectorProps {
  value?: string;
  onChange?: (flowId: string) => void;
  onlyPublished?: boolean;
  /** flowId - id from flow object of whatsapp, dbFlowId - id from our db */
  id?: "flowId" | "dbFlowId";
  label?: React.ReactNode;
  placeholder?: string;
  error?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  /** Accepted for call-site compatibility; the shadcn Select filters natively. */
  searchable?: boolean;
}

export function FlowSelector({
  value,
  onChange,
  id = "dbFlowId",
  onlyPublished = false,
  label = "Flow",
  placeholder = "Select flow",
  error,
  disabled,
  className,
}: Readonly<FlowSelectorProps>) {
  const { data: flows, isLoading } = useWaFlowsFromDb();

  if (isLoading || !flows) {
    return <Skeleton className="mt-2 h-11 w-full" />;
  }

  const filteredFlows = onlyPublished
    ? flows.filter((flow) => flow.status === WaFlowStatus.PUBLISHED)
    : flows;

  const selectOptions = filteredFlows.map((flow) => ({
    value: flow[id],
    label: flow.name,
  }));

  return (
    <div className={className}>
      {label && <Label className="mb-1">{label}</Label>}
      <Select
        // TODO: check why flowId is saved as number in db
        value={value?.toString() ?? ""}
        onValueChange={onChange}
        items={selectOptions}
        disabled={disabled}
      >
        <SelectTrigger className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {selectOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
