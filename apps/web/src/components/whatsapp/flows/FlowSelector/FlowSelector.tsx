import { useId } from "react";

import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
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
  /**
   * Restrict the list to flows that live on this number's WABA. Meta scopes flow ids to
   * a WABA, so a flow picked from another number cannot be used — attaching one to a
   * template's FLOW button fails at Meta with "the flow does not exist".
   */
  whatsappSettingsPhoneId?: string;
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
  whatsappSettingsPhoneId,
}: Readonly<FlowSelectorProps>) {
  const uid = useId();
  const { data: flows, isLoading } = useWaFlowsFromDb(true, whatsappSettingsPhoneId);

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
    <Field className={className}>
      {label && (
        <FieldLabel htmlFor={`${uid}-field`} className="mb-1">
          {label}
        </FieldLabel>
      )}
      <Select
        // TODO: check why flowId is saved as number in db
        value={value?.toString() ?? ""}
        onValueChange={(v) => onChange?.(v ?? "")}
        items={selectOptions}
        disabled={disabled}
      >
        <SelectTrigger id={`${uid}-field`} className="w-full" aria-invalid={!!error}>
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
    </Field>
  );
}
