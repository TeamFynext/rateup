/*
 * shadcn-based drop-in replacements for the Mantine + Contained* inputs that the
 * node editor used to rely on. These keep the old prop names/shapes so the large
 * editor form can switch off Mantine without rewriting every field's logic.
 */
import { Loader2 } from "lucide-react";
import * as React from "react";

import { Badge as UiBadge } from "@/components/ui/badge.tsx";
import { Button as UiButton } from "@/components/ui/button.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import {
  Field as UiField,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { RadioGroup as UiRadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch as UiSwitch } from "@/components/ui/switch.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";

type Option = { value: string; label: React.ReactNode };

/**
 * Props the Mantine originals accepted that these shims still take. Spacing is
 * translated onto `style`; the rest are layout hints the shadcn primitives
 * handle themselves and are accepted so call sites did not have to change.
 */
interface LegacySpacingProps {
  p?: number | string;
  m?: number | string;
  mt?: number | string;
  mb?: number | string;
  mx?: number | string;
  my?: number | string;
  c?: string;
  w?: number | string;
  flex?: number | string;
  size?: string;
  style?: React.CSSProperties;
  allowDeselect?: boolean;
  searchable?: boolean;
  nothingFoundMessage?: React.ReactNode;
  maxValues?: number;
  rightSection?: React.ReactNode;
  rightSectionPointerEvents?: string;
}

/** Accepts Mantine-style `data` (string[] or {value,label}[]) and normalizes it. */
function toOptions(data?: Array<string | Option> | null): Option[] {
  return (data || []).map((d) => (typeof d === "string" ? { value: d, label: d } : d));
}

// ── Layout ──────────────────────────────────────────────────────────────
const GAP: Record<string, string> = { xs: "gap-2", sm: "gap-2.5", md: "gap-4", lg: "gap-5" };

export function Stack({
  children,
  gap = "md",
  className,
  ...rest
}: Readonly<
  { children?: React.ReactNode; gap?: string; className?: string } & LegacySpacingProps
>) {
  // strip Mantine-only spacing props we don't forward to the DOM
  const { p, my, mt, mb, mx, style } = rest;
  return (
    <div
      className={cn("flex flex-col", GAP[gap] ?? "gap-4", className)}
      style={{
        padding: p ? 8 : undefined,
        marginTop: mt ? 8 : undefined,
        marginBottom: mb ? 8 : undefined,
        marginBlock: my ? 8 : undefined,
        marginInline: mx ? 8 : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Group({
  children,
  justify,
  grow,
  gap = "sm",
  className,
  ...rest
}: Readonly<
  {
    children?: React.ReactNode;
    justify?: string;
    grow?: boolean;
    gap?: string | number;
    className?: string;
  } & LegacySpacingProps
>) {
  const { mt, style } = rest;
  const gapClass = typeof gap === "number" ? undefined : (GAP[gap] ?? "gap-3");
  return (
    <div
      className={cn(
        "flex flex-wrap items-center",
        gapClass,
        grow && "*:flex-1",
        justify === "center" && "justify-center",
        justify === "space-between" && "justify-between",
        justify === "flex-end" && "justify-end",
        className,
      )}
      style={{
        gap: typeof gap === "number" ? gap : undefined,
        marginTop: mt ? 24 : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Text ────────────────────────────────────────────────────────────────
const TEXT_SIZE: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

export function Text({
  children,
  size,
  fw,
  c,
  ta,
  span,
  truncate,
  className,
  ...rest
}: Readonly<
  {
    children?: React.ReactNode;
    size?: string;
    fw?: number;
    c?: string;
    ta?: string;
    span?: boolean;
    truncate?: boolean | string;
    className?: string;
  } & LegacySpacingProps
>) {
  const { mt, mb, style } = rest;
  const Comp = span ? "span" : "p";
  return (
    <Comp
      className={cn(
        TEXT_SIZE[size ?? "md"],
        fw && fw >= 600 ? "font-semibold" : fw && fw >= 500 ? "font-medium" : undefined,
        c === "dimmed" && "text-muted-foreground",
        (c === "red" || c === "red.6") && "text-destructive",
        ta === "center" && "text-center",
        truncate && "truncate",
        className,
      )}
      style={{ marginTop: mt ? 8 : undefined, marginBottom: mb ? 8 : undefined, ...style }}
    >
      {children}
    </Comp>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────
function mapVariant(v?: string) {
  switch (v) {
    case "outline":
      return "outline";
    case "light":
    case "subtle":
      return "ghost";
    case "transparent":
      return "ghost";
    default:
      return "default";
  }
}

export function Button({
  children,
  variant,
  size,
  leftSection,
  loading,
  className,
  ...rest
}: Readonly<
  {
    children?: React.ReactNode;
    variant?: string;
    size?: string;
    leftSection?: React.ReactNode;
    loading?: boolean;
    className?: string;
  } & LegacySpacingProps &
    Omit<React.ComponentProps<"button">, "size" | "style">
>) {
  const { mt, style, ...buttonProps } = rest;
  const sz = size === "xs" || size === "compact-xs" ? "xs" : size === "sm" ? "sm" : "default";
  return (
    <UiButton
      variant={mapVariant(variant)}
      size={sz}
      className={className}
      style={{ marginTop: mt ? 8 : undefined, ...style }}
      {...buttonProps}
    >
      {loading ? <Loader2 className="animate-spin" /> : leftSection}
      {children}
    </UiButton>
  );
}

export function ActionIcon({
  children,
  color,
  size,
  loading,
  className,
  ...rest
}: Readonly<
  {
    children?: React.ReactNode;
    color?: string;
    size?: string;
    loading?: boolean;
    className?: string;
  } & LegacySpacingProps &
    Omit<React.ComponentProps<"button">, "size" | "style">
>) {
  const { mt, c, style, ...buttonProps } = rest;
  const sz = size === "sm" ? "icon-sm" : size === "xs" ? "icon-xs" : "icon-sm";
  return (
    <UiButton
      variant="ghost"
      size={sz}
      className={cn((color === "red" || c === "red") && "text-destructive", className)}
      style={{ marginTop: mt ? 24 : undefined, ...style }}
      {...buttonProps}
    >
      {loading ? <Loader2 className="animate-spin" /> : children}
    </UiButton>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────
export function Badge({
  children,
  color,
  leftSection,
  className,
}: Readonly<{
  children?: React.ReactNode;
  color?: string;
  variant?: string;
  size?: string;
  leftSection?: React.ReactNode;
  tt?: string;
  className?: string;
}>) {
  const colorClass =
    color === "green"
      ? "bg-green-500/15 text-green-600 dark:text-green-400"
      : color === "blue"
        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
        : "bg-muted text-muted-foreground";
  return (
    <UiBadge className={cn("border-transparent normal-case", colorClass, className)}>
      {leftSection}
      {children}
    </UiBadge>
  );
}

// ── Switch (with label + description) ───────────────────────────────────
export function Switch({
  label,
  description,
  checked,
  onChange,
  onCheckedChange,
}: Readonly<{
  label?: React.ReactNode;
  description?: React.ReactNode;
  checked?: boolean;
  onChange?: (e: { target: { checked: boolean }; currentTarget: { checked: boolean } }) => void;
  onCheckedChange?: (checked: boolean) => void;
}>) {
  const id = React.useId();
  return (
    <UiField orientation="horizontal" className="gap-3">
      <UiSwitch
        id={id}
        checked={!!checked}
        onCheckedChange={(v) => {
          onChange?.({ target: { checked: v }, currentTarget: { checked: v } });
          onCheckedChange?.(v);
        }}
        className="mt-0.5"
      />
      <FieldContent className="gap-0.5">
        {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
        {description && <FieldDescription className="text-xs">{description}</FieldDescription>}
      </FieldContent>
    </UiField>
  );
}

// ── Field wrapper (label + description + error) ─────────────────────────
function Field({
  label,
  description,
  required,
  error,
  className,
  style,
  children,
}: Readonly<{
  label?: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  error?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}>) {
  return (
    <UiField className={cn("gap-1.5", className)} style={style} data-invalid={!!error || undefined}>
      {label && (
        <FieldTitle className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </FieldTitle>
      )}
      {children}
      {error ? (
        <FieldError className="text-xs">{error}</FieldError>
      ) : (
        description && <FieldDescription className="text-xs">{description}</FieldDescription>
      )}
    </UiField>
  );
}

// ── Select (single) ─────────────────────────────────────────────────────
function SelectField({
  label,
  description,
  required,
  withAsterisk,
  placeholder,
  value,
  data,
  onChange,
  error,
  className,
  style,
}: Readonly<
  {
    label?: React.ReactNode;
    description?: React.ReactNode;
    required?: boolean;
    withAsterisk?: boolean;
    placeholder?: string;
    value?: string | null;
    data?: Array<string | Option> | null;
    onChange?: (value: string, option?: Option) => void;
    error?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  } & LegacySpacingProps
>) {
  const options = toOptions(data);
  return (
    <Field
      label={label}
      description={description}
      required={required || withAsterisk}
      error={error}
      className={className}
      style={style}
    >
      <UiSelect
        items={options}
        value={value ?? null}
        onValueChange={(v: string | null) =>
          onChange?.(
            v ?? "",
            options.find((o) => o.value === v),
          )
        }
      >
        <SelectTrigger className="w-full" aria-invalid={!!error || undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </UiSelect>
    </Field>
  );
}

/** Mantine `<Select>` shim (label, data, value, onChange(value, option)). */
export const Select = SelectField;
/** Contained selection shim — same surface as SelectField. */
export const ContainedSelection = SelectField;

// ── Text field ──────────────────────────────────────────────────────────
export const ContainedTextField = React.forwardRef<
  HTMLInputElement,
  {
    label?: React.ReactNode;
    description?: React.ReactNode;
    required?: boolean;
    value?: string;
    placeholder?: string;
    type?: string;
    maxLength?: number;
    disabled?: boolean;
    rightSection?: React.ReactNode;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    className?: string;
    error?: React.ReactNode;
    /** Layout escape hatches carried over from the Mantine-era API. */
    flex?: React.CSSProperties["flex"];
    mt?: boolean | number | string;
    style?: React.CSSProperties;
  } & Omit<
    React.ComponentPropsWithoutRef<"input">,
    "onChange" | "onKeyDown" | "value" | "type" | "style" | "className"
  >
>(function ContainedTextField(
  { label, description, required, error, rightSection, className, flex, mt, style, ...inputProps },
  ref,
) {
  return (
    <Field
      label={label}
      description={description}
      required={required}
      error={error}
      style={{ flex, marginTop: mt ? 8 : undefined, ...style }}
    >
      <div className="relative flex items-center">
        <Input
          ref={ref}
          aria-invalid={!!error || undefined}
          className={cn(rightSection && "pr-9", className)}
          {...inputProps}
        />
        {rightSection && <div className="absolute right-1 flex items-center">{rightSection}</div>}
      </div>
    </Field>
  );
});

// ── Number field ────────────────────────────────────────────────────────
export function ContainedNumberInput({
  label,
  description,
  min,
  value,
  onChange,
  error,
}: Readonly<{
  label?: React.ReactNode;
  description?: React.ReactNode;
  min?: number;
  value?: string | number;
  onChange?: (value: string) => void;
  error?: React.ReactNode;
}>) {
  return (
    <Field label={label} description={description} error={error}>
      <Input
        type="number"
        min={min}
        aria-invalid={!!error || undefined}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </Field>
  );
}

// ── Multi select ────────────────────────────────────────────────────────
export function ContainedMultiSelect({
  label,
  description,
  placeholder,
  data,
  value,
  onChange,
}: Readonly<
  {
    label?: React.ReactNode;
    description?: React.ReactNode;
    placeholder?: string;
    searchable?: boolean;
    data?: Array<string | Option> | null;
    value?: string[];
    onChange?: (value: string[]) => void;
  } & LegacySpacingProps
>) {
  const options = toOptions(data).map((o) => ({ value: o.value, label: o.label }));
  return (
    <Field label={label} description={description}>
      <MultiSelect
        options={options}
        value={value ?? []}
        onValueChange={(v) => onChange?.(v)}
        placeholder={placeholder}
      />
    </Field>
  );
}

// ── Date picker ─────────────────────────────────────────────────────────
export function ContainedDatePickerInput({
  label,
  description,
  value,
  onChange,
}: Readonly<{
  label?: React.ReactNode;
  description?: React.ReactNode;
  placeholder?: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
}>) {
  return (
    <Field label={label} description={description}>
      <DatePicker value={value} onChange={onChange} className="w-full" />
    </Field>
  );
}

// ── Radio ───────────────────────────────────────────────────────────────
export function RadioGroup({
  value,
  onChange,
  children,
}: Readonly<{
  value?: string;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
}>) {
  return (
    <UiRadioGroup value={value ?? null} onValueChange={(v: string) => onChange?.(v)}>
      {children}
    </UiRadioGroup>
  );
}

export function Radio({ value, label }: Readonly<{ value: string; label?: React.ReactNode }>) {
  const id = React.useId();
  return (
    <UiField orientation="horizontal" className="w-auto gap-2">
      <RadioGroupItem id={id} value={value} />
      <FieldLabel htmlFor={id} className="font-normal">
        {label}
      </FieldLabel>
    </UiField>
  );
}

// ── Segmented control ───────────────────────────────────────────────────
export function SegmentedControl({
  value,
  onChange,
  data,
}: Readonly<{
  value?: string;
  onChange?: (value: string) => void;
  data: Array<{ label: React.ReactNode; value: string }>;
}>) {
  return (
    <div className="inline-flex w-full rounded-lg border border-border bg-muted p-0.5">
      {data.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange?.(o.value)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Tooltip (Mantine `label` API) ───────────────────────────────────────
export function TooltipWrap({
  label,
  children,
}: Readonly<{ label: React.ReactNode; children: React.ReactElement }>) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
export { TooltipWrap as Tooltip };

// ── FileButton ──────────────────────────────────────────────────────────
export function FileButton({
  onChange,
  accept,
  resetRef,
  children,
}: Readonly<{
  onChange: (file: File) => void;
  accept?: string;
  resetRef?: React.RefObject<(() => void) | null>;
  children: (props: { onClick: () => void }) => React.ReactNode;
}>) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  if (resetRef) {
    resetRef.current = () => {
      if (inputRef.current) inputRef.current.value = "";
    };
  }
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(file);
        }}
      />
      {children({ onClick: () => inputRef.current?.click() })}
    </>
  );
}

// ── Image ───────────────────────────────────────────────────────────────
export function Image({
  src,
  alt,
  h,
  w,
  mah,
  mx,
  className,
}: Readonly<{
  src?: string;
  alt?: string;
  h?: number;
  w?: number;
  mah?: number;
  mx?: string | number;
  className?: string;
}>) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn("rounded-md object-cover", className)}
      style={{
        height: h,
        width: w,
        maxHeight: mah,
        marginInline: mx === "auto" ? "auto" : mx,
      }}
    />
  );
}

// ── Minimal @mantine/form replacement ───────────────────────────────────

/** The field bindings `useForm` hands to an input. */
interface GetInputProps<T> {
  (
    name: keyof T,
    opts: { type: "checkbox" },
  ): { checked: boolean; onChange: (e: { target?: { checked?: boolean } } | boolean) => void };
  <K extends keyof T>(
    name: K,
    opts?: { type?: "input" },
  ): { value: T[K]; error: React.ReactNode; onChange: (arg: unknown) => void };
}

/** Distinguishes a DOM change event from a bare value handed to `onChange`. */
function isChangeEvent(arg: unknown): arg is { target?: { value?: unknown } } {
  return typeof arg === "object" && arg !== null && "target" in arg;
}

type FormValue = unknown;
type Validator = (
  value: FormValue,
  values?: Record<string, FormValue>,
) => React.ReactNode | null | undefined;

export function isNotEmpty(message: React.ReactNode = "Required"): Validator {
  return (value: FormValue) => {
    const empty = value == null || value === "" || (Array.isArray(value) && value.length === 0);
    return empty ? message : null;
  };
}

export function useForm<T extends Record<string, FormValue>>(config: {
  initialValues: T;
  validate?: Partial<Record<keyof T, Validator>>;
  onValuesChange?: (values: T) => void;
}) {
  const [values, setValues] = React.useState<T>(config.initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, React.ReactNode>>>({});
  const valuesRef = React.useRef(values);
  valuesRef.current = values;
  const cfg = React.useRef(config);
  cfg.current = config;

  const runValidate = React.useCallback((vals: T) => {
    const errs: Partial<Record<keyof T, React.ReactNode>> = {};
    const rules: Partial<Record<keyof T, Validator>> = cfg.current.validate || {};
    (Object.keys(rules) as Array<keyof T>).forEach((key) => {
      const res = rules[key]?.(vals[key], vals);
      if (res) errs[key] = res;
    });
    return errs;
  }, []);

  const setFieldValue = React.useCallback(
    (name: keyof T, value: FormValue) => {
      if (Object.is(valuesRef.current[name], value)) return;
      const next = { ...valuesRef.current, [name]: value };
      valuesRef.current = next;
      setValues(next);
      setErrors(runValidate(next));
      cfg.current.onValuesChange?.(next);
    },
    [runValidate],
  );

  const validate = React.useCallback(() => {
    const errs = runValidate(valuesRef.current);
    setErrors(errs);
    return { hasErrors: Object.keys(errs).length > 0, errors: errs };
  }, [runValidate]);

  // Overloaded so a checkbox field gets `checked` and everything else gets the
  // field's own value type; the implementation is one function, as with any
  // overload set.
  const getInputProps = React.useCallback(
    ((name: keyof T, opts?: { type?: "checkbox" | "input" }) => {
      if (opts?.type === "checkbox") {
        return {
          checked: !!valuesRef.current[name],
          onChange: (e: { target?: { checked?: boolean } } | boolean) =>
            setFieldValue(name, typeof e === "boolean" ? e : (e?.target?.checked ?? e)),
        };
      }
      return {
        value: valuesRef.current[name] ?? "",
        error: errors[name],
        onChange: (arg: unknown) =>
          setFieldValue(
            name,
            isChangeEvent(arg) && arg.target?.value !== undefined ? arg.target.value : arg,
          ),
      };
    }) as GetInputProps<T>,
    [errors, setFieldValue],
  );

  return { values, errors, setFieldValue, validate, getInputProps };
}
