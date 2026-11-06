import { IconAlertTriangle } from "@tabler/icons-react";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

/** Sentinel for "leave this row out of the sync"; the Select has no empty value. */
const UNMAPPED = "__unmapped__";

export interface MappingRow {
  id: string;
  label: string;
}

export interface MappingOption {
  value: string;
  label: string;
}

/**
 * One list mapped onto another: board columns onto a CRM's stages, or a CRM's statuses onto
 * board columns. Every CRM integration has one, and each used to draw its own.
 *
 * Direction is the caller's: `rows` are what is being mapped and each gets one Select over
 * `options`. The editor holds no state — `value` is keyed by row id and every change goes
 * straight back through `onChange` — so a page decides for itself whether a mapping saves on
 * change, on a button, or inside a dialog.
 *
 * Unmapped rows are called out twice: once at the top, because on a long board the rows that
 * need attention are the ones scrolled past, and once on the row itself. Unmapped is the
 * state that silently does nothing, and it is also the default, so a board that was never
 * mapped would otherwise look exactly like one mapped on purpose.
 */
export function StageMappingEditor({
  rows,
  options,
  value,
  onChange,
  rowsLabel,
  optionsLabel,
  unmappedLabel,
  unmappedHint,
  summary,
  placeholder,
  onOptionsOpenChange,
  empty,
  disabled = false,
}: Readonly<{
  rows: readonly MappingRow[];
  options: readonly MappingOption[];
  /** Row id → option value. A row that is absent, or maps to `undefined`, is unmapped. */
  value: Readonly<Record<string, string | undefined>>;
  onChange: (rowId: string, optionValue: string | undefined) => void;
  /** Column headings, e.g. "Pipeline column" and "Bigin stage". */
  rowsLabel: string;
  optionsLabel: string;
  /**
   * Offers "leave unmapped" as a choice, under this label. Without it a row can only be
   * mapped, and an unmapped one is simply one nobody has picked for yet.
   */
  unmappedLabel?: string;
  /** Under an unmapped row: what leaving it means for the sync. */
  unmappedHint?: string;
  /** The line over the list while anything is unmapped. Defaults to a plain count. */
  summary?: (unmapped: number, total: number) => ReactNode;
  placeholder?: string;
  /** For options fetched live from the provider: refresh them when a Select opens. */
  onOptionsOpenChange?: (open: boolean) => void;
  /** Shown instead of the list when there are no rows. */
  empty?: ReactNode;
  disabled?: boolean;
}>) {
  const { t } = useTranslation();

  // Base UI's Select renders the raw value unless the Root is given the value→label pairs;
  // without `items` the trigger would show a provider's opaque id.
  const items = useMemo(
    () => [
      ...(unmappedLabel ? [{ value: UNMAPPED, label: unmappedLabel }] : []),
      ...options.map((option) => ({ value: option.value, label: option.label })),
    ],
    [options, unmappedLabel],
  );

  const isMapped = (rowId: string) => {
    const mapped = value[rowId];
    if (!mapped) return false;
    // Options still loading: trust the saved mapping rather than flash every row as unmapped.
    return options.length === 0 || options.some((option) => option.value === mapped);
  };
  const unmappedCount = rows.filter((row) => !isMapped(row.id)).length;

  if (rows.length === 0) {
    return (
      <>{empty ?? <p className="text-sm text-muted-foreground">{t("Nothing to map yet.")}</p>}</>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {unmappedCount > 0 && (
        <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-500">
          <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {summary
              ? summary(unmappedCount, rows.length)
              : t("{count} of {total} not mapped yet.", {
                  count: unmappedCount,
                  total: rows.length,
                })}
          </span>
        </p>
      )}

      <div className="grid max-w-150 grid-cols-2 items-center gap-x-3 gap-y-2">
        <span className="text-xs font-medium text-muted-foreground">{rowsLabel}</span>
        <span className="text-xs font-medium text-muted-foreground">{optionsLabel}</span>

        {rows.map((row) => {
          const mapped = isMapped(row.id);
          return (
            <div key={row.id} className="contents">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" title={row.label}>
                  {row.label}
                </p>
                {!mapped && unmappedHint && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-500">
                    <IconAlertTriangle className="size-3.5 shrink-0" />
                    {unmappedHint}
                  </p>
                )}
              </div>
              <Select
                items={items}
                disabled={disabled}
                onOpenChange={onOptionsOpenChange}
                // A mapping to an option that no longer exists (renamed or deleted in the
                // provider) shows as unmapped rather than as a raw id.
                value={mapped ? (value[row.id] as string) : unmappedLabel ? UNMAPPED : null}
                // Base UI hands back null when cleared; both that and the sentinel mean
                // "unmapped", which the caller stores as `undefined`.
                onValueChange={(next) =>
                  onChange(row.id, next && next !== UNMAPPED ? String(next) : undefined)
                }
              >
                {/* `w-full`: the trigger is `w-fit` by default, so each row would size to its
                    own label and the column would come out ragged. */}
                <SelectTrigger className="w-full" aria-label={`${row.label}: ${optionsLabel}`}>
                  <SelectValue placeholder={placeholder ?? t("Select")} />
                </SelectTrigger>
                <SelectContent>
                  {unmappedLabel && <SelectItem value={UNMAPPED}>{unmappedLabel}</SelectItem>}
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Whether every row points at an option that still exists. */
export function isFullyMapped(
  rows: readonly MappingRow[],
  options: readonly MappingOption[],
  value: Readonly<Record<string, string | undefined>>,
) {
  const known = new Set(options.map((option) => option.value));
  return rows.every((row) => {
    const mapped = value[row.id];
    return mapped !== undefined && known.has(mapped);
  });
}
