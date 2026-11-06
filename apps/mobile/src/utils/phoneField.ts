import {
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

import { countries } from "@/constants/countries";

/** `+91`, from libphonenumber rather than the table, whose NANP entries read `+1-268`. */
export function dialCode(country: string): string {
  try {
    return `+${getCountryCallingCode(country as CountryCode)}`;
  } catch {
    return countries.find((c) => c.code === country)?.dial_code ?? "";
  }
}

/** A stored number (`919188346187`, with or without `+`) split into country and national part. */
export function splitPhone(
  stored: string | null | undefined,
  fallbackCountry = "IN",
): { country: string; national: string } {
  if (!stored) return { country: fallbackCountry, national: "" };
  const parsed = parsePhoneNumberFromString(stored.startsWith("+") ? stored : `+${stored}`);
  if (!parsed) return { country: fallbackCountry, national: stored.replace(/[^\d]/g, "") };
  return { country: parsed.country ?? fallbackCountry, national: parsed.nationalNumber };
}

/**
 * The number in international digits (`919188346187`, how the API stores it), or null when
 * it is not a valid number for that country. A pasted `+44…` wins over the picked country.
 */
export function toInternationalDigits(country: string, national: string): string | null {
  const typed = national.trim();
  if (!typed) return null;
  const parsed = typed.startsWith("+")
    ? parsePhoneNumberFromString(typed)
    : parsePhoneNumberFromString(typed, country as CountryCode);
  if (!parsed || !isValidPhoneNumber(parsed.number)) return null;
  return parsed.number.replace("+", "");
}
