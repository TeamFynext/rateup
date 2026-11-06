import type { ColumnFiltersState } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";
import { SourceSelector } from "@/components/dashboard/contacts/components/data-table-toolbar.tsx";
import { StageSelector, usePipelineStages } from "@/components/pipeline/shared/StageSelector.tsx";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
import { useDebouncedState } from "@/hooks/use-debounced-state.ts";
import { cn } from "@/lib/utils";

import { Input } from "../ui/input.tsx";
import { MultiSelect } from "../ui/multi-select.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { LifecycleSelector } from "./LifecycleSelector.tsx";

/**
 * Label, stage, source and custom-field filters for a contact picker, shared by "Add existing
 * contacts" on a group and the campaign audience picker.
 *
 * Every key is one the contacts list endpoint reads (`GET /contact`), so the filtering is done
 * by the server, and `toContactListQuery` turns the same state into the body an "add all
 * matching" call sends — the server resolves it with the very where clause the list used.
 */
export function useContactListFilters(onChange?: () => void) {
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [source, setSource] = useState("all");
  // A board column (stageId) where the org has a Leads board, else a lifecycle — the same swap
  // the contacts page makes, so every screen filters in one vocabulary.
  const [stageId, setStageId] = useState("all");
  const [lifecycleId, setLifecycleId] = useState("all");
  const hasBoard = usePipelineStages().length > 0;
  const [customFieldId, setCustomFieldId] = useState<string | null>(null);
  const [customFieldValue, setCustomFieldValue] = useDebouncedState("", 300);
  // The value input is uncontrolled; bumping this remounts it empty on clear.
  const [resetKey, setResetKey] = useState(0);

  const filters = useMemo<ColumnFiltersState>(() => {
    const list: ColumnFiltersState = [];
    if (labelIds.length > 0) list.push({ id: "labelIds", value: labelIds.join(",") });
    if (source !== "all") list.push({ id: "source", value: source });
    if (hasBoard && stageId !== "all") list.push({ id: "stageId", value: stageId });
    if (!hasBoard && lifecycleId !== "all") list.push({ id: "lifecycleId", value: lifecycleId });
    if (customFieldId) {
      list.push({ id: "customFieldId", value: customFieldId });
      if (customFieldValue.trim()) {
        list.push({ id: "customFieldValue", value: customFieldValue.trim() });
      }
    }
    return list;
  }, [labelIds, source, hasBoard, stageId, lifecycleId, customFieldId, customFieldValue]);

  const clear = useCallback(() => {
    setLabelIds([]);
    setSource("all");
    setStageId("all");
    setLifecycleId("all");
    setCustomFieldId(null);
    setCustomFieldValue("");
    setResetKey((key) => key + 1);
  }, [setCustomFieldValue]);

  return {
    filters,
    clear,
    controls: {
      labelIds,
      setLabelIds,
      source,
      setSource,
      stageId,
      setStageId,
      lifecycleId,
      setLifecycleId,
      hasBoard,
      customFieldId,
      setCustomFieldId,
      customFieldValue,
      setCustomFieldValue,
      resetKey,
      onChange,
    },
  };
}

export type ContactListFilterControls = ReturnType<typeof useContactListFilters>["controls"];

/** The list query an "add all matching" call sends: the filter keys plus any search. */
export function toContactListQuery(filters: ColumnFiltersState, search = "") {
  const query: Record<string, string> = Object.fromEntries(
    filters.map((item) => [item.id, String(item.value)]),
  );
  if (search.trim()) query.search = search.trim();
  return query;
}

export function ContactListFilters({
  controls,
  className,
}: Readonly<{ controls: ContactListFilterControls; className?: string }>) {
  const { t } = useTranslation();
  const { data: contactLabels = [] } = useContactLabels();
  const { customFields } = useCustomFieldsContext();
  const {
    labelIds,
    setLabelIds,
    source,
    setSource,
    stageId,
    setStageId,
    lifecycleId,
    setLifecycleId,
    hasBoard,
    customFieldId,
    setCustomFieldId,
    customFieldValue,
    setCustomFieldValue,
    resetKey,
    onChange,
  } = controls;
  const customField = customFields.find((field) => field.id === customFieldId);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-48 flex-1">
          <MultiSelect
            options={contactLabels.map((label) => ({ value: label.id, label: label.name }))}
            value={labelIds}
            onValueChange={(values) => {
              setLabelIds(values);
              onChange?.();
            }}
            placeholder={t("Filter by label")}
          />
        </div>
        {hasBoard ? (
          <StageSelector
            all
            className="w-44"
            value={stageId}
            onChange={(value) => {
              setStageId(value || "all");
              onChange?.();
            }}
          />
        ) : (
          <LifecycleSelector
            all
            className="w-44"
            value={lifecycleId}
            onChange={(value) => {
              setLifecycleId(value || "all");
              onChange?.();
            }}
          />
        )}
        <SourceSelector
          value={source}
          onChange={(value) => {
            setSource(value || "all");
            onChange?.();
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={customFieldId}
          onValueChange={(value) => {
            setCustomFieldId(value ?? null);
            setCustomFieldValue("");
            onChange?.();
          }}
          items={customFields.map((field) => ({ value: field.id, label: field.name }))}
        >
          <SelectTrigger className="w-44 border-none bg-muted">
            <span className="text-sm">
              <SelectValue placeholder={t("Custom field")} />
            </span>
          </SelectTrigger>
          <SelectContent>
            {customFields.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {customField?.type === "multivalue" ? (
          <Select
            // Keyed on the field so switching fields drops the old field's choice.
            key={customField.id}
            value={customFieldValue || null}
            onValueChange={(value) => {
              setCustomFieldValue(value ?? "");
              onChange?.();
            }}
            items={(customField.listValues ?? []).map((value) => ({ value, label: value }))}
          >
            <SelectTrigger className="min-w-40 flex-1 border-none bg-muted">
              <span className="text-sm">
                <SelectValue placeholder={t("Any value")} />
              </span>
            </SelectTrigger>
            <SelectContent>
              {(customField.listValues ?? []).map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            key={`${customField?.id ?? "none"}-${resetKey}`}
            aria-label={t("Custom field value")}
            type={customField?.type === "number" ? "number" : "text"}
            className="min-w-40 flex-1 border-none bg-muted placeholder:text-sm"
            placeholder={customField ? t("Equals… (empty = any value)") : t("Pick a field first")}
            disabled={!customField}
            defaultValue={customFieldValue}
            onChange={(event) => {
              setCustomFieldValue(event.currentTarget.value);
              onChange?.();
            }}
          />
        )}
      </div>
    </div>
  );
}
