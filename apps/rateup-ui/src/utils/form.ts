/**
 * `z.coerce.number()` fields have an *input* type of `unknown`, so react-hook-form hands
 * their value back unnarrowed and a bare `{...field}` spread does not type-check against
 * `<Input>`. This renders whatever is there as the input's `value`.
 */
export const numberInputValue = (value: unknown): string | number =>
  typeof value === "number" || typeof value === "string" ? value : "";
