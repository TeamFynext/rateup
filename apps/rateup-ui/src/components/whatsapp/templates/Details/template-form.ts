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
export const inputProps = (form: TemplateForm, p: string) => {
  const current: unknown = form.watch(path(p));
  return {
    name: p,
    value: typeof current === "string" ? current : "",
    onChange: (event: unknown) =>
      setValue(
        form,
        p,
        isChangeEvent(event) && event.target !== undefined ? event.target.value : event,
      ),
  };
};

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

const CAROUSEL_FIELDS = new Set(["mediaCarousel", "productCarousel"]);

/**
 * First validation message in an RHF error tree, for the save toast. The toast is all the
 * customer sees, so an error inside a carousel card names the card ("Card 2: …").
 */
export function firstErrorMessage(errors: unknown, trail: string[] = []): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    // RHF keeps the field's DOM element under `ref`; it holds no messages.
    if (key === "ref") continue;
    const message = (value as { message?: unknown } | null)?.message;
    if (typeof message === "string" && message) {
      const [field, cardIndex] = [...trail, key];
      return field && CAROUSEL_FIELDS.has(field) && cardIndex && /^\d+$/.test(cardIndex)
        ? `Card ${Number(cardIndex) + 1}: ${message}`
        : message;
    }
    if (value && typeof value === "object") {
      const nested = firstErrorMessage(value, [...trail, key]);
      if (nested) return nested;
    }
  }
  return undefined;
}

/**
 * Rewrites WhatsApp's own rejection messages that customers can't act on. Anything not
 * recognised is returned unchanged.
 */
export function friendlyWhatsAppError(message: string): string {
  const missing = /Button at index (\d+) is missing expected field\(s\) \((.+?)\)/i.exec(message);
  if (missing) {
    const field = missing[2] === "text" ? "text" : missing[2]!.replace(/_/g, " ");
    return `Button ${Number(missing[1]) + 1} has no ${field}. Fill it in and save again.`;
  }
  return message;
}
