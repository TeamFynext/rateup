// Extracted verbatim from `util.ts`. Behaviour is unchanged.

export interface InitialValues {
  [key: string]: {
    type: string;
    /** `null`/`undefined` for fields that start empty, e.g. date pickers. */
    value:
      | string
      | number
      | boolean
      | string[]
      | { id: string; title: string }[]
      | null
      | undefined;
    /** Extra props forwarded verbatim to the field component this entry renders. */
    extra?: {
      max?: number;
      required?: boolean;
      disabled?: boolean;
      clearable?: boolean;
      allowDeselect?: boolean;
      data?: string[];
      defaultValue?: string;
      type?: string;
      size?: string;
      mt?: string | number;
      onMessage?: string;
      offMessage?: string;
      onlyTitle?: boolean;
      maxImages?: number;
      aspectRatioOptions?: unknown;
      scaleTypeOptions?: unknown;
    };
    metaType?: string;
  };
}

/** Reads one property off a value that may not be an object. */
export const prop = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>)[key] : undefined;

/**
 * A field's max length lives in zod's internal check descriptors, which are not part of its
 * public types — so walk them as `unknown` rather than reaching through `def`.
 */
export const maxLengthOf = (field: unknown): number | undefined => {
  const checks = prop(prop(field, "def"), "checks");
  if (!Array.isArray(checks)) return undefined;
  const check = checks.find((c) => prop(prop(prop(c, "_zod"), "def"), "check") === "max_length");
  const maximum = prop(prop(prop(check, "_zod"), "def"), "maximum");
  return typeof maximum === "number" ? maximum : undefined;
};
