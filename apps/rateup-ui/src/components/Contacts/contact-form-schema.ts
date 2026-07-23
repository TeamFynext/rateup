import type { TFunction } from "i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import z from "zod";

import { importMethod } from "@/utils/enums/index.ts";

export interface ContactCustomFieldValue {
  id?: string;
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Name and phone are only required for manually entered contacts — a CSV import
 * supplies them per row instead.
 *
 * Custom field values are validated positionally (`customFields.<index>.value`), which
 * is also how `ContactForm` reads their errors. The definition for each entry is found
 * by its `fieldId`, so a value whose custom field has since been deleted is left alone.
 */
export const buildContactSchema = (t: TFunction, customFields: any[] = []) =>
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
