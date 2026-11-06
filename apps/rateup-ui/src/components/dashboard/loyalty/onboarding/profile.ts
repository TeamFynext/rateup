import type { ProfileStepPayload } from "@/backend/loyalty/onboarding.api";

import type { ProfileFormValues } from "./schemas.ts";

/** The browser's own zone, so a merchant in Dubai does not start on Kolkata. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}

/** `""` from an optional input means "cleared", which the API spells `null`. */
function orNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

/** The form's values as the profile step endpoint wants them. */
export function toProfilePayload(values: ProfileFormValues): ProfileStepPayload {
  return {
    name: values.name.trim(),
    businessName: values.businessName.trim(),
    currencyCode: values.currencyCode,
    currencySymbol: values.currencySymbol,
    timezone: values.timezone,
    contactName: orNull(values.contactName),
    contactPhone: orNull(values.contactPhone),
    contactEmail: orNull(values.contactEmail),
    logoUrl: orNull(values.logoUrl),
    brandColor: values.brandColor.toLowerCase(),
    heroImageUrl: orNull(values.heroImageUrl),
  };
}
