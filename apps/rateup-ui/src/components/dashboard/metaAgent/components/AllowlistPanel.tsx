import { zodResolver } from "@hookform/resolvers/zod";
import { IconCircleX, IconPlus } from "@tabler/icons-react";
import { useForm } from "react-hook-form";

import { ALLOWLIST_MAX_ENTRIES } from "@/backend/metaAgent/metaAgent.api";
import {
  useAddAllowlistEntry,
  useAllowlist,
  useRemoveAllowlistEntry,
  useSyncAllowlist,
} from "@/backend/metaAgent/metaAgent.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { Skeleton } from "@/components/ui/skeleton";

import { allowlistFormSchema, type AllowlistFormValues } from "../metaAgent.schemas";
import { FormField } from "./shared/FormField";
import { PanelCard } from "./shared/PanelCard";

export function AllowlistPanel({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data: allowlist, isLoading } = useAllowlist(waSettingsId);
  const addEntry = useAddAllowlistEntry(waSettingsId);
  const removeEntry = useRemoveAllowlistEntry(waSettingsId);
  const sync = useSyncAllowlist(waSettingsId);

  const form = useForm<AllowlistFormValues>({
    resolver: zodResolver(allowlistFormSchema),
    defaultValues: { phone: "" },
  });

  const full = (allowlist?.length ?? 0) >= ALLOWLIST_MAX_ENTRIES;

  const onSubmit = (values: AllowlistFormValues) =>
    addEntry.mutate(values.phone, { onSuccess: () => form.reset() });

  return (
    <PanelCard
      title="Allowlist"
      description="The numbers the agent answers while the audience is set to allowlisted numbers only. Pilot with your own team first."
      count={allowlist?.length ?? 0}
      onSync={() => sync.mutate()}
      isSyncing={sync.isPending}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FieldGroup>
          <FormField
            control={form.control}
            name="phone"
            label="Consumer phone number"
            required
            description={
              full
                ? `The allowlist is full: Meta allows ${ALLOWLIST_MAX_ENTRIES} numbers. Remove one to add another.`
                : `E.164 format, including the country code. Up to ${ALLOWLIST_MAX_ENTRIES} numbers.`
            }
          >
            {(field, controlProps) => (
              <div className="flex flex-wrap items-start gap-2">
                <PhoneInput
                  {...controlProps}
                  name={field.name}
                  defaultCountry="IN"
                  international
                  countryCallingCodeEditable={false}
                  placeholder="Enter phone number"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  className="w-full max-w-72"
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={full}
                  loading={addEntry.isPending}
                >
                  <IconPlus data-icon="inline-start" />
                  Add
                </Button>
              </div>
            )}
          </FormField>
        </FieldGroup>
      </form>

      {isLoading && <Skeleton className="mt-4 h-8 w-full" />}

      {!isLoading && !allowlist?.length && (
        <p className="mt-4 text-sm text-muted-foreground">
          No numbers allowlisted. With the allowlisted-only audience, the agent will not answer
          anyone.
        </p>
      )}

      {!!allowlist?.length && (
        <div className="mt-4 flex flex-wrap gap-2">
          {allowlist.map((entry) => (
            <Badge key={entry.id} variant="secondary" className="gap-1.5 pr-1 text-sm">
              {entry.consumerPhoneNumber}
              <button
                type="button"
                aria-label={`Remove ${entry.consumerPhoneNumber}`}
                className="rounded-full p-0.5 hover:bg-background/60"
                disabled={removeEntry.isPending}
                onClick={() => removeEntry.mutate(entry.id)}
              >
                <IconCircleX className="size-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </PanelCard>
  );
}
