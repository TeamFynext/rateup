import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import type { AgentBudgets } from "@/backend/metaAgent/metaAgent.api";
import {
  useAgentBudgets,
  useSyncAgentBudgets,
  useUpdateAgentBudgets,
} from "@/backend/metaAgent/metaAgent.query";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/usePermission";

import { budgetFormSchema, type BudgetFormValues } from "../metaAgent.schemas";
import { FormField } from "./shared/FormField";
import { PanelCard } from "./shared/PanelCard";

const UNIT_ITEMS = [
  { value: "ai_turn", label: "AI replies per conversation" },
  { value: "token", label: "Tokens across the business" },
] as const;

const WINDOW_ITEMS = [
  { value: "one_day", label: "Rolling 1 day" },
  { value: "seven_days", label: "Rolling 7 days" },
  { value: "fourteen_days", label: "Rolling 14 days" },
  { value: "thirty_days", label: "Rolling 30 days" },
] as const;

const toForm = (data?: AgentBudgets): BudgetFormValues => ({ budgets: data?.budgets ?? [] });

/**
 * Meta's agent budgets: caps on AI replies per conversation and on token use,
 * each over a rolling window. Saving replaces the whole set at Meta, so the form
 * is the full list and removing a row deletes that cap.
 */
export function UsageCapsPanel({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data, isLoading } = useAgentBudgets(waSettingsId);
  const update = useUpdateAgentBudgets(waSettingsId);
  const sync = useSyncAgentBudgets(waSettingsId);
  const canManage = useCan("meta_agent.manage");

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: toForm(),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "budgets" });

  useEffect(() => {
    if (data) form.reset(toForm(data));
  }, [data, form]);

  const onSubmit = (values: BudgetFormValues) => update.mutate(values.budgets);

  return (
    <PanelCard
      title="Usage caps"
      description="Limit how much the agent does so costs stay predictable. When a cap is reached the agent finishes its current reply, then hands new messages to your team until the window rolls over. With no caps, usage is unlimited."
      count={data?.budgets.length ?? 0}
      syncedAt={data?.budgetsSyncedAt}
      onSync={() => sync.mutate()}
      isSyncing={sync.isPending}
    >
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No caps set. The agent can answer as much as customers ask.
              </p>
            )}

            {fields.map((row, index) => (
              <div
                key={row.id}
                className="grid grid-cols-1 items-start gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_11rem_9rem_auto]"
              >
                <FormField control={form.control} name={`budgets.${index}.unit_type`} label="Limit">
                  {(field, controlProps) => (
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "ai_turn")}
                      items={UNIT_ITEMS}
                      disabled={!canManage}
                    >
                      <SelectTrigger {...controlProps} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
                <FormField
                  control={form.control}
                  name={`budgets.${index}.time_window`}
                  label="Window"
                >
                  {(field, controlProps) => (
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "one_day")}
                      items={WINDOW_ITEMS}
                      disabled={!canManage}
                    >
                      <SelectTrigger {...controlProps} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WINDOW_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
                <FormField control={form.control} name={`budgets.${index}.max_budget`} label="Cap">
                  {(field, controlProps) => (
                    <Input
                      {...controlProps}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      disabled={!canManage}
                      value={Number.isNaN(field.value) ? "" : field.value}
                      onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      onBlur={field.onBlur}
                    />
                  )}
                </FormField>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="sm:mt-6"
                  aria-label="Remove this cap"
                  disabled={!canManage}
                  onClick={() => remove(index)}
                >
                  <IconTrash />
                </Button>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={!canManage}
                onClick={() =>
                  append({ unit_type: "ai_turn", time_window: "one_day", max_budget: 20 })
                }
              >
                <IconPlus data-icon="inline-start" />
                Add a cap
              </Button>
              <Button
                type="submit"
                disabled={!canManage || !form.formState.isDirty}
                loading={update.isPending}
              >
                Save &amp; push to Meta
              </Button>
            </div>
            {!canManage && (
              <p className="text-xs text-muted-foreground">Only admins can change usage caps.</p>
            )}
          </FieldGroup>
        </form>
      )}
    </PanelCard>
  );
}
