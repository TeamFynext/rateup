import { useRef } from "react";
import type { DefaultValues, FieldValues, UseFormReturn } from "react-hook-form";
import { useForm as useRhfForm } from "react-hook-form";

/**
 * TRANSITIONAL migration bridge.
 *
 * The engine is react-hook-form. Validation accepts either a zod schema or
 * Mantine-style per-field validators. On top of it this exposes the handful of
 * helpers the legacy `@mantine/form` call sites used, so large form trees can
 * move off Mantine without rewriting every binding at once.
 *
 * New forms should use `useForm` from react-hook-form directly with
 * `Controller` + the shadcn `Field` primitives. Call sites using this bridge
 * are expected to be converted to idiomatic RHF incrementally.
 */
export interface BridgedForm<T extends FieldValues> extends UseFormReturn<T> {
  /** All current values (re-renders on any change, like Mantine's `form.values`). */
  values: T;
  /** Flat, dotted-path error lookup (`errors["buttons.0.text"]`). */
  errors: Record<string, string | undefined>;
  getInputProps: (
    path: string,
    options?: { type?: "checkbox" | "input" },
  ) => {
    name: string;
    value?: any;
    checked?: boolean;
    onChange: (event: any) => void;
    error?: string;
  };
  /**
   * Like `getInputProps` but returns only DOM-safe props, so the result can be
   * spread straight onto a shadcn `Input`/`Textarea` without React warning about
   * an unknown `error` attribute. Read the message via `form.errors[path]`.
   */
  getFieldProps: (path: string) => {
    name: string;
    value: any;
    onChange: (event: any) => void;
  };
  setFieldValue: (path: string, value: unknown) => void;
  insertListItem: (path: string, item: unknown, index?: number) => void;
  removeListItem: (path: string, index: number) => void;
  /** Shallow-merges the given values into the form (Mantine `setValues`). */
  setValues: (values: Partial<T>) => void;
  /** React key helper for list rows (Mantine `form.key`). */
  key: (path: string) => string;
  /** Synchronous validation, mirroring Mantine's `form.validate()`. */
  validate: () => { hasErrors: boolean; errors: Record<string, string> };
  /** Synchronous validity check, mirroring Mantine's `form.isValid()`. */
  isValid: () => boolean;
  /** Mantine's `form.onSubmit(handler)` — an onSubmit handler that validates first. */
  onSubmit: (
    handler: (values: T, event?: any) => void,
    onError?: (errors: Record<string, any>) => void,
  ) => (event?: any) => void;
  /** Mantine's `form.onReset` — resets the form to its initial values. */
  onReset: (event?: any) => void;
  /** Mantine's `form.setErrors({ field: message })`. */
  setErrors: (errors: Record<string, string | null | undefined>) => void;
  /** Mantine's `form.setFieldError(field, message)`. */
  setFieldError: (path: string, message: string | null | undefined) => void;
  /** Mantine's `form.setInitialValues` — changes what `reset()` restores. */
  setInitialValues: (values: Partial<T>) => void;
}

type FieldValidator<T> = (value: any, values: T, path: string) => string | null | undefined | false;

/**
 * Mantine-style per-field validators: `{ field: (value, values, path) => string | null }`.
 * A nested `{ field: { "*": fn } }` runs `fn` against every entry of the array or
 * object at `field`, exactly as Mantine did.
 */
export type ValidateRecord<T> = Record<string, FieldValidator<T> | { "*": FieldValidator<T> }>;

/** Replacement for `isNotEmpty` from `@mantine/form`. */
export function isNotEmpty(error = "Required") {
  return (value: any) => {
    if (Array.isArray(value)) return value.length > 0 ? null : error;
    if (typeof value === "string") return value.trim().length > 0 ? null : error;
    return value !== null && value !== undefined && value !== false ? null : error;
  };
}

/** Reads a possibly-nested RHF error message using a dotted path. */
function errorAt(errors: unknown, path: string): string | undefined {
  const node = path
    .split(".")
    .reduce<any>((acc, part) => (acc == null ? acc : acc[part]), errors as any);
  const message = node?.message;
  return typeof message === "string" ? message : undefined;
}

export function useBridgedForm<T extends FieldValues>({
  schema,
  validate,
  defaultValues,
}: {
  /** Optional zod schema; omit for forms that validate imperatively. */
  schema?: any;
  /** Optional Mantine-style per-field validators (used when `schema` is absent). */
  validate?: ValidateRecord<T>;
  defaultValues: DefaultValues<T>;
}): BridgedForm<T> {
  /** Runs whichever validation strategy was supplied, returning a flat error map. */
  const runValidation = (values: any): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (schema) {
      const result = schema.safeParse(values);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = issue.path.join(".");
          if (key && !errors[key]) errors[key] = issue.message;
        }
      }
    }
    if (validate) {
      for (const [field, check] of Object.entries(validate)) {
        if (typeof check === "function") {
          const message = check(values?.[field], values, field);
          if (message) errors[field] = message;
          continue;
        }
        // Nested `{ "*": fn }` — run against each entry of the array/object.
        const itemCheck = check?.["*"];
        const collection = values?.[field];
        if (typeof itemCheck !== "function" || !collection) continue;
        for (const key of Object.keys(collection)) {
          const path = `${field}.${key}`;
          const message = itemCheck(collection[key], values, path);
          if (message) errors[path] = message;
        }
      }
    }
    return errors;
  };

  const initialValuesRef = useRef(defaultValues);

  const form = useRhfForm<T>({
    resolver: (values: any) => {
      const errors = runValidation(values);
      const keys = Object.keys(errors);
      if (!keys.length) return { values, errors: {} };
      return {
        values: {},
        errors: Object.fromEntries(
          keys.map((k) => [k, { type: "validation", message: errors[k] }]),
        ) as any,
      };
    },
    defaultValues,
  });

  const values = form.watch();

  const setFieldValue = (path: string, value: unknown) =>
    form.setValue(path as any, value as any, { shouldDirty: true });

  const readList = (path: string): unknown[] => {
    const current = form.getValues(path as any);
    return Array.isArray(current) ? [...current] : [];
  };

  const getInputProps = (path: string, options?: { type?: "checkbox" | "input" }) => {
    const current = form.watch(path as any);
    if (options?.type === "checkbox") {
      return {
        name: path,
        checked: !!current,
        onChange: (event: any) => setFieldValue(path, event?.target ? event.target.checked : event),
      };
    }
    return {
      name: path,
      value: current ?? "",
      // Accepts a DOM event (inputs) or a bare value (selects/custom controls),
      // matching how Mantine's getInputProps behaved.
      onChange: (event: any) =>
        setFieldValue(path, event?.target !== undefined ? event.target.value : event),
      error: errorAt(form.formState.errors, path),
    };
  };

  // Legacy call sites read `form.errors["a.b.0.c"]`; RHF nests them instead.
  const errors = new Proxy({} as Record<string, string | undefined>, {
    get: (_target, key) =>
      typeof key === "string" ? errorAt(form.formState.errors, key) : undefined,
  });

  return Object.assign(form, {
    values,
    errors,
    getInputProps,
    getFieldProps: (path: string) => {
      const { error: _error, ...rest } = getInputProps(path);
      return rest as { name: string; value: any; onChange: (event: any) => void };
    },
    setFieldValue,
    insertListItem: (path: string, item: unknown, index?: number) => {
      const list = readList(path);
      if (index == null) list.push(item);
      else list.splice(index, 0, item);
      setFieldValue(path, list);
    },
    removeListItem: (path: string, index: number) => {
      setFieldValue(
        path,
        readList(path).filter((_, i) => i !== index),
      );
    },
    setValues: (next: Partial<T>) => {
      Object.entries(next ?? {}).forEach(([k, v]) => setFieldValue(k, v));
    },
    key: (path: string) => path,
    validate: () => {
      const errors = runValidation(form.getValues());
      return { hasErrors: Object.keys(errors).length > 0, errors };
    },
    isValid: () => Object.keys(runValidation(form.getValues())).length === 0,
    onSubmit:
      (
        handler: (values: T, event?: any) => void,
        onError?: (errors: Record<string, any>) => void,
      ) =>
      (event?: any) =>
        form.handleSubmit(
          (values) => handler(values as T, event),
          (errors) => onError?.(errors),
        )(event),
    onReset: (event?: any) => {
      event?.preventDefault?.();
      form.reset(initialValuesRef.current);
    },
    // Mantine's `reset()` restores the *initial* values, which `setInitialValues`
    // can move; RHF's would always go back to the original `defaultValues`.
    reset: (values?: any, options?: any) =>
      values === undefined
        ? form.reset(initialValuesRef.current, options)
        : form.reset(values, options),
    setErrors: (errors: Record<string, string | null | undefined>) => {
      Object.entries(errors ?? {}).forEach(([path, message]) => {
        if (message) form.setError(path as any, { type: "validation", message });
        else form.clearErrors(path as any);
      });
    },
    setFieldError: (path: string, message: string | null | undefined) => {
      if (message) form.setError(path as any, { type: "validation", message });
      else form.clearErrors(path as any);
    },
    setInitialValues: (next: Partial<T>) => {
      initialValuesRef.current = { ...initialValuesRef.current, ...next } as DefaultValues<T>;
    },
  }) as BridgedForm<T>;
}
