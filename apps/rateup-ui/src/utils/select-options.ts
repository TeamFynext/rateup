export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Normalises the option shapes used across the app — `string[]`,
 * `{ value, label }[]`, or grouped `{ group, items }[]` — into a flat
 * `{ value, label }[]` suitable for `Select` / `MultiSelect`.
 */
export function toSelectOptions(data: unknown): SelectOption[] {
  if (!Array.isArray(data)) return [];

  return data.flatMap((entry: any): SelectOption[] => {
    if (typeof entry === "string") return [{ value: entry, label: entry }];
    if (entry && Array.isArray(entry.items)) return toSelectOptions(entry.items);
    if (entry && entry.value !== undefined) {
      return [{ value: String(entry.value), label: String(entry.label ?? entry.value) }];
    }
    return [];
  });
}
