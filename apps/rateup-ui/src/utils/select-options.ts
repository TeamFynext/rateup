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

  return data.flatMap((entry): SelectOption[] => {
    if (typeof entry === "string") return [{ value: entry, label: entry }];
    if (!entry || typeof entry !== "object") return [];
    const option = entry as { items?: unknown; value?: unknown; label?: unknown };
    if (Array.isArray(option.items)) return toSelectOptions(option.items);
    if (option.value !== undefined) {
      return [{ value: String(option.value), label: String(option.label ?? option.value) }];
    }
    return [];
  });
}
