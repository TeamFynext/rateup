import { Field, FieldDescription, FieldError, FieldTitle } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toSelectOptions } from "@/utils/select-options.ts";

/**
 * Field controls for the flow-v2 element editor, which renders inputs
 * dynamically from a `type -> component` map and so needs every variant to
 * share one prop shape.
 *
 * The `onChange` contract matches what `InlineElementEditor` expects: text and
 * number inputs emit a DOM event, everything else emits the value directly.
 */
interface BaseFieldProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  value?;
  onChange?: (eventOrValue) => void;
  [key: string]: unknown;
}

function Shell({
  label,
  description,
  error,
  className,
  children,
}: React.PropsWithChildren<Pick<BaseFieldProps, "label" | "description" | "error" | "className">>) {
  return (
    <Field className={className}>
      {label ? <FieldTitle>{label}</FieldTitle> : null}
      {children}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{String(error)}</FieldError> : null}
    </Field>
  );
}

export function TextField({
  label,
  description,
  error,
  className,
  value,
  onChange,
  placeholder,
  disabled,
}: BaseFieldProps) {
  return (
    <Shell label={label} description={description} error={error} className={className}>
      <Input
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
      />
    </Shell>
  );
}

/** Text field with a live `length / max` counter. */
export function TextFieldWithCounter({ max, ...props }: BaseFieldProps & { max?: number }) {
  const length = typeof props.value === "string" ? props.value.length : 0;
  if (!max) return <TextField {...props} />;

  return (
    <Shell
      label={props.label}
      description={props.description}
      error={props.error}
      className={props.className}
    >
      <InputGroup aria-invalid={!!props.error}>
        <InputGroupInput
          value={props.value ?? ""}
          onChange={props.onChange}
          placeholder={props.placeholder}
          disabled={props.disabled}
          maxLength={max}
        />
        <InputGroupAddon align="inline-end">
          <span className="text-xs text-muted-foreground">{`${length} / ${max}`}</span>
        </InputGroupAddon>
      </InputGroup>
    </Shell>
  );
}

export function NumberField({
  label,
  description,
  error,
  className,
  value,
  onChange,
  placeholder,
  disabled,
  min,
  max,
}: BaseFieldProps) {
  return (
    <Shell label={label} description={description} error={error} className={className}>
      <Input
        type="number"
        min={min}
        max={max}
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        // Emits a number (or "" when cleared), as the old control did.
        onChange={(event) => {
          const raw = event.target.value;
          onChange?.(raw === "" ? "" : Number(raw));
        }}
      />
    </Shell>
  );
}

export function SelectField({
  label,
  description,
  error,
  className,
  value,
  onChange,
  placeholder,
  disabled,
  data,
}: BaseFieldProps) {
  const options = toSelectOptions(data);
  return (
    <Shell label={label} description={description} error={error} className={className}>
      <Select
        items={options}
        value={value ?? ""}
        onValueChange={(next) => onChange?.(next)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Shell>
  );
}

export function MultiSelectField({
  label,
  description,
  error,
  className,
  value,
  onChange,
  placeholder,
  disabled,
  data,
}: BaseFieldProps) {
  return (
    <Shell label={label} description={description} error={error} className={className}>
      <MultiSelect
        options={toSelectOptions(data)}
        value={Array.isArray(value) ? value : []}
        onValueChange={(next) => onChange?.(next)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </Shell>
  );
}

export function DateField({
  label,
  description,
  error,
  className,
  value,
  onChange,
  disabled,
  minDate,
  maxDate,
}: BaseFieldProps) {
  return (
    <Shell label={label} description={description} error={error} className={className}>
      <Input
        type="date"
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        min={minDate}
        max={maxDate}
        aria-invalid={!!error}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </Shell>
  );
}
