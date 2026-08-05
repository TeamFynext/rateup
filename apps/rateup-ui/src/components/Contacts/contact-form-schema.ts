import type { TFunction } from "i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import z from "zod";

import type { CustomFieldData } from "@/backend/campaign/contacts/contacts.api";
import { importMethod } from "@/utils/enums/index.ts";

export interface ContactCustomFieldValue {
  /** The custom field definition's id — the API writes it as the value row's FK. */
  id?: string;
  /** The definition's slug; `ContactForm` matches its inputs to entries by it. */
  fieldId: string;
  value: string;
}

export interface ContactFormValues {
  name: string;
  phone: string;
  email: string;
  dob: Date | string | null;
  source: string;
  contactType: string[];
  countryCode: string;
  customFields: ContactCustomFieldValue[];
  updateExisting: boolean;
  hasHeaderRow: boolean;
  external_id: string;
  labels: string[];
  contactGroupIds: string[];
  assignedUserIds: string[];
  lifecycleId: string;
  notes: string;
}

export const contactFormDefaults: ContactFormValues = {
  name: "",
  phone: "",
  email: "",
  dob: null,
  source: importMethod.MANUAL,
  contactType: [],
  countryCode: "91",
  customFields: [],
  updateExisting: false,
  hasHeaderRow: true,
  external_id: "",
  labels: [],
  contactGroupIds: [],
  assignedUserIds: [],
  lifecycleId: "",
  notes: "",
};

/**
 * Prefilled form values. Callers pass either a saved contact being edited (`id` present) or a
 * draft assembled elsewhere — the inbox's "add this sender" flow supplies only a few fields.
 *
 * Most columns are nullable on `Contact` in the API (name, phone, source, email, external_id,
 * lifecycleId, notes), so every text field is `string | null` here — see {@link toFormValues}.
 */
export interface ContactInitialValues {
  id?: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  dob?: Date | string | null;
  source?: string | null;
  profilePic?: string | null;
  labels?: (string | undefined | null)[];
  contactGroupIds?: (string | undefined | null)[];
  assignedUserIds?: (string | undefined | null)[];
  lifecycleId?: string | null;
  notes?: string | null;
  external_id?: string | null;
  contactType?: string[];
  updateExisting?: boolean;
  /** Saved custom field values as the API returns them, keyed by the definition's id. */
  customFields?: Array<{ fieldId?: string | null; value?: string | null }>;
}

/** Drop the blanks a partially-joined relation leaves behind (`label?.id` is optional). */
const toIdList = (values?: (string | undefined | null)[]): string[] =>
  values?.filter((value): value is string => !!value) ?? [];

/** The form stores phones in E.164; the API keeps them without the leading `+`. */
const toPhoneValue = (phone?: string | null): string => {
  if (!phone) return "";
  return phone.startsWith("+") ? phone : `+${phone}`;
};

/**
 * Saved values key `fieldId` to the definition's id, while the form keys its entries by slug
 * (`ContactForm` looks them up that way) and sends the definition id back as `id`. A value whose
 * definition has since been deleted is dropped — the API rejects an unknown field id.
 *
 * Carrying these across matters on edit: an update replaces the contact's whole custom field set,
 * so anything missing from the payload is deleted.
 */
const toCustomFieldValues = (
  saved: ContactInitialValues["customFields"],
  definitions: CustomFieldData[],
): ContactCustomFieldValue[] =>
  saved?.flatMap((entry) => {
    const definition = definitions.find(
      (field) => field.id === entry.fieldId || field.slug === entry.fieldId,
    );
    if (!definition) return [];
    return [{ id: definition.id, fieldId: definition.slug, value: entry.value ?? "" }];
  }) ?? [];

/**
 * Merge a contact over the form defaults, coercing every absent column to its default. Spreading
 * the raw contact instead would push the API's `null`s into fields the schema types as `string`,
 * and validation then blocks the save with "Invalid input: expected string, received null" for a
 * field the user never touched.
 */
export const toFormValues = (
  initialValues?: ContactInitialValues | null,
  customFields: CustomFieldData[] = [],
): ContactFormValues => {
  if (!initialValues) return { ...contactFormDefaults };
  return {
    ...contactFormDefaults,
    name: initialValues.name ?? "",
    phone: toPhoneValue(initialValues.phone),
    email: initialValues.email ?? "",
    dob: initialValues.dob ?? null,
    source: initialValues.source ?? contactFormDefaults.source,
    external_id: initialValues.external_id ?? "",
    lifecycleId: initialValues.lifecycleId ?? "",
    notes: initialValues.notes ?? "",
    labels: toIdList(initialValues.labels),
    contactGroupIds: toIdList(initialValues.contactGroupIds),
    assignedUserIds: toIdList(initialValues.assignedUserIds),
    contactType: initialValues.contactType ?? contactFormDefaults.contactType,
    updateExisting: initialValues.updateExisting ?? contactFormDefaults.updateExisting,
    customFields: toCustomFieldValues(initialValues.customFields, customFields),
  };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Name and phone are only required for manually entered contacts — a CSV import
 * supplies them per row instead.
 *
 * Custom field values are validated positionally (`customFields.<index>.value`), which
 * is also how `ContactForm` reads their errors. The definition for each entry is found
 * by its `fieldId`, so a value whose custom field has since been deleted is left alone.
 */
export const buildContactSchema = (t: TFunction, customFields: CustomFieldData[] = []) =>
  z
    .object({
      name: z.string(),
      phone: z.string(),
      email: z.string(),
      dob: z.custom<Date | string | null>(),
      source: z.string(),
      contactType: z.array(z.string()),
      countryCode: z.string(),
      customFields: z.array(
        z.object({
          id: z.string().optional(),
          fieldId: z.string(),
          value: z.string(),
        }),
      ),
      updateExisting: z.boolean(),
      hasHeaderRow: z.boolean(),
      external_id: z.string(),
      labels: z.array(z.string()),
      contactGroupIds: z.array(z.string()),
      assignedUserIds: z.array(z.string()),
      lifecycleId: z.string(),
      notes: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.source === importMethod.MANUAL) {
        if (!values.name?.length) {
          ctx.addIssue({ code: "custom", path: ["name"], message: t("Name cannot be blank") });
        }
        if (!values.phone) {
          ctx.addIssue({
            code: "custom",
            path: ["phone"],
            message: t("Phone Number cannot be blank"),
          });
        } else if (!isValidPhoneNumber(values.phone)) {
          ctx.addIssue({ code: "custom", path: ["phone"], message: t("Invalid phone number") });
        }
      }

      values.customFields?.forEach((entry, index) => {
        const definition = customFields.find((field) => field.slug === entry.fieldId);
        if (!definition || !entry.value) return;

        if (definition.type === "email" && !EMAIL_PATTERN.test(entry.value)) {
          ctx.addIssue({
            code: "custom",
            path: ["customFields", index, "value"],
            message: t("Invalid email format."),
          });
        }
        if (definition.type === "number" && Number.isNaN(Number(entry.value))) {
          ctx.addIssue({
            code: "custom",
            path: ["customFields", index, "value"],
            message: t("Must be a valid number"),
          });
        }
      });
    });
