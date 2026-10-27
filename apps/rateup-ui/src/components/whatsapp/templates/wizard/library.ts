import type { LibraryTemplate } from "@/backend/whatsapp/whatsapp.api";
import { WHATSAPP_BUTTON_TYPE, WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "@/utils/constants.ts";
import { parseStringWithVariables } from "@/utils/whatsapp/templates.tsx";

import type { TemplateFormValues } from "../Details/template-form.ts";
import type { StarterTemplate } from "./starter-templates.ts";

/**
 * "ORDER_MANAGEMENT" → "Order management". Meta's use-case values carry typos
 * (`APPOINTMENT_SCHEDULEING`); they are shown as Meta wrote them, never corrected.
 */
export function humanize(value: string | null | undefined): string {
  if (!value) return "";
  const words = value.toLowerCase().split("_").filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The library's languages are full locales (`en_US`), and its filter wants one.
 * The editor's own list says `en` for English, so that one is widened.
 */
export function libraryLanguage(formLanguage: string | undefined): string {
  if (!formLanguage || formLanguage === "en") return "en_US";
  return formLanguage;
}

/** What one library entry asks of the business before it can be created. */
export interface LibraryInputs {
  /** By button index: a URL or phone number. */
  buttons: Record<number, { url?: string; urlSuffixExample?: string; phoneNumber?: string }>;
  /** By param name: fixed text baked into the body. */
  body: Record<string, string>;
}

export const EMPTY_LIBRARY_INPUTS: LibraryInputs = { buttons: {}, body: {} };

/** The first thing still missing, said the way the footer says it; `null` when complete. */
export function libraryInputsBlocker(entry: LibraryTemplate, inputs: LibraryInputs): string | null {
  for (const required of entry.required_inputs.buttons) {
    const value = inputs.buttons[required.index];
    const label = required.text ? `“${required.text}”` : `button ${required.index + 1}`;
    if (required.needs === "url") {
      const url = value?.url?.trim() ?? "";
      if (!url) return `Add the link for ${label}`;
      if (!/^https?:\/\/\S+\.\S+/i.test(url))
        return `The link for ${label} must start with https://`;
      if (url.includes("{{1}}") && !value?.urlSuffixExample?.trim()) {
        return `Give an example value for {{1}} in ${label}`;
      }
    }
    if (required.needs === "phone_number" && !value?.phoneNumber?.trim()) {
      return `Add the phone number for ${label}`;
    }
  }
  for (const input of entry.required_inputs.body_inputs) {
    if (!inputs.body[input.param_name]?.trim()) return `Fill in “${humanize(input.param_name)}”`;
  }
  return null;
}

const LIBRARY_BUTTON_TYPE: Record<string, WHATSAPP_BUTTON_TYPE> = {
  URL: WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE,
  PHONE_NUMBER: WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER,
  QUICK_REPLY: WHATSAPP_BUTTON_TYPE.QUICK_REPLY,
};

/**
 * A library entry as an ordinary editable template — what "Customize" hands the editor.
 * Edited, it is no longer the library's wording, so it goes through Meta review. FLOW and
 * OTP buttons need set-up the library does for you, so they are dropped here.
 */
export function libraryToFormValues(
  entry: LibraryTemplate,
  inputs: LibraryInputs,
): Partial<TemplateFormValues> {
  const textHeader = entry.header_type === "TEXT" && entry.header;
  // Body inputs (a business name, say) are fixed text, so they are written into the body.
  const body = Object.entries(inputs.body).reduce(
    (text, [name, value]) => (value.trim() ? text.replaceAll(`{{${name}}}`, value.trim()) : text),
    entry.body,
  );
  const variables = parseStringWithVariables(body);
  return {
    category: entry.category,
    language: entry.language,
    format: textHeader
      ? WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT
      : WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE,
    header: textHeader || null,
    body,
    // Meta reviews with sample values; the library rarely sends its own, so each gets a
    // stand-in the reader can replace on the Message step.
    example: variables.map((_, index) => entry.body_params[index] || `Example ${index + 1}`),
    footer: entry.footer ?? "",
    buttons: entry.buttons.flatMap((button, index): TemplateFormValues["buttons"] => {
      const type = LIBRARY_BUTTON_TYPE[button.type];
      if (!type) return [];
      const given = inputs.buttons[index];
      if (type === WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE) {
        return [{ type, text: button.text ?? "", url: given?.url ?? button.url ?? "" }];
      }
      if (type === WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER) {
        return [
          {
            type,
            text: button.text ?? "",
            phone_number: given?.phoneNumber ?? button.phone_number ?? "",
          },
        ];
      }
      return [{ type, text: button.text ?? "" }];
    }),
  };
}

/** A RateUp starter as editor values. */
export function starterToFormValues(starter: StarterTemplate): Partial<TemplateFormValues> {
  return {
    name: starter.name,
    category: starter.category,
    templateType: starter.templateType,
    format: starter.format ?? WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE,
    header: starter.header ?? null,
    body: starter.body ?? "",
    example: starter.example ?? [],
    footer: starter.footer ?? "Powered by rateup.app",
    buttons: (starter.buttons ?? []).map((button) => ({
      type: WHATSAPP_BUTTON_TYPE.QUICK_REPLY,
      text: button.text ?? "",
    })),
  };
}

/** A name Meta accepts, from free text: lower case, digits and underscores. */
export function toTemplateName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 512);
}
