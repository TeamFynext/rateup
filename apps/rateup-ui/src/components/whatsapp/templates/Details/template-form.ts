import type { FieldPath, UseFormReturn } from "react-hook-form";
import type { z } from "zod/v4";

import { getNestedProperty } from "@/utils/misc/obj.utils.ts";

import type { templateSchema } from "../Schema/templateSchema.ts";

export type TemplateFormValues = z.infer<typeof templateSchema>;
export type TemplateForm = UseFormReturn<TemplateFormValues>;

/**
 * Path-based accessors for the WhatsApp template form.
 *
 * The editor addresses fields by paths built at runtime from list indices —
 * `buttons.3.text`, `mediaCarousel.1.buttons.0.url`,
 * `defaultValues.catalog.mpm.sections.2.products`. None of those can be expressed as a
 * statically-known RHF `FieldPath`, so the casts are confined to this module rather than
 * being repeated at every call site.
 */
const path = (p: string) => p as FieldPath<TemplateFormValues>;

/** Registers a plain input at a dynamic path. */
export const registerField = (form: TemplateForm, p: string) => form.register(path(p));

/** Writes a value, re-validating only once the form has been submitted at least once. */
export const setValue = (form: TemplateForm, p: string, value: unknown) =>
  form.setValue(path(p), value as never, {
    shouldDirty: true,
    shouldValidate: form.formState.isSubmitted,
  });

/** Reads the error message at a dotted path, if any. */
export const errorAt = (form: TemplateForm, p: string): string | undefined =>
  getNestedProperty<{ message?: string }>(form.formState.errors, p)?.message;

/**
 * Controlled `value`/`onChange` pair for components that take them directly (selectors,
 * the phone input) rather than spreading `register`.
 */
/** Distinguishes a DOM change event from a bare value handed to `onChange`. */
function isChangeEvent(value: unknown): value is { target?: { value?: unknown } } {
  return typeof value === "object" && value !== null && "target" in value;
}

/**
 * Every consumer is a selector or text control that takes a string, so a non-string value
 * at the path reads as empty rather than being handed on.
 */
export const inputProps = (form: TemplateForm, p: string) => ({
  name: p,
  value: typeof form.watch(path(p)) === "string" ? String(form.watch(path(p))) : "",
  onChange: (event: { target?: { value?: unknown } } | unknown) =>
    setValue(
      form,
      p,
      isChangeEvent(event) && event.target !== undefined ? event.target.value : event,
    ),
});

const readList = (form: TemplateForm, p: string): unknown[] => {
  const current = form.getValues(path(p));
  return Array.isArray(current) ? [...current] : [];
};

/** Appends to a list, or inserts at `index` when given. */
export const appendItem = (form: TemplateForm, p: string, item: unknown, index?: number) => {
  const list = readList(form, p);
  if (index == null) list.push(item);
  else list.splice(index, 0, item);
  setValue(form, p, list);
};

export const removeItem = (form: TemplateForm, p: string, index: number) =>
  setValue(
    form,
    p,
    readList(form, p).filter((_, i) => i !== index),
  );
