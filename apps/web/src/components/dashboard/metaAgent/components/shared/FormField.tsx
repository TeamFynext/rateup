import type {
  ControllerRenderProps,
  FieldPath,
  FieldValues,
  UseControllerProps,
} from "react-hook-form";
import { Controller } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

/** Spread onto the control so the error is announced with the field. */
export interface ControlProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
}

type FormFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = UseControllerProps<TValues, TName> & {
  label: string;
  /** Renders the `*` marker; set it wherever the schema demands a value. */
  required?: boolean;
  description?: string;
  /** Right-aligned in the label row, e.g. a character counter. */
  hint?: React.ReactNode;
  orientation?: "vertical" | "horizontal" | "responsive";
  className?: string;
  children: (
    field: ControllerRenderProps<TValues, TName>,
    controlProps: ControlProps,
  ) => React.ReactNode;
};

/**
 * A `Field` wired to react-hook-form: label (with a required marker where the
 * schema demands the value), description, control, then the error the resolver
 * produced — always in that order, always tied together by id.
 */
export function FormField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  label,
  required,
  description,
  hint,
  orientation,
  className,
  children,
  ...controllerProps
}: Readonly<FormFieldProps<TValues, TName>>) {
  return (
    <Controller
      {...controllerProps}
      render={({ field, fieldState }) => {
        const errorId = `${field.name}-error`;
        return (
          <Field data-invalid={fieldState.invalid} orientation={orientation} className={className}>
            <div className="flex items-baseline justify-between gap-2">
              <FieldLabel htmlFor={field.name}>
                {label}
                {required && (
                  <>
                    <span aria-hidden className="text-destructive">
                      *
                    </span>
                    <span className="sr-only">(required)</span>
                  </>
                )}
              </FieldLabel>
              {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
            </div>
            {children(field, {
              id: field.name,
              "aria-invalid": fieldState.invalid,
              "aria-describedby": fieldState.invalid ? errorId : undefined,
            })}
            {description && !fieldState.invalid && (
              <FieldDescription>{description}</FieldDescription>
            )}
            {fieldState.invalid && <FieldError id={errorId} errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
}
