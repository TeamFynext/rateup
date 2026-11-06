import type { ShopAddress } from "@/backend/commerce/shop.api";

/**
 * What a delivery address needs before an order can be paid. Mirrors rateup-api's
 * `modules/commerce/shop/addressRules.ts`, which refuses payment without it; change both together.
 */

/** Countries whose addresses carry no postal code, so the field stays optional there. */
const NO_POSTAL_CODE = new Set([
  "AE",
  "AG",
  "AO",
  "AW",
  "BF",
  "BI",
  "BJ",
  "BO",
  "BS",
  "BW",
  "BZ",
  "CF",
  "CG",
  "CI",
  "CK",
  "CM",
  "DJ",
  "DM",
  "ER",
  "FJ",
  "GA",
  "GD",
  "GH",
  "GM",
  "GQ",
  "GY",
  "HK",
  "JM",
  "KI",
  "KM",
  "KN",
  "KP",
  "LC",
  "ML",
  "MO",
  "MR",
  "MW",
  "NR",
  "NU",
  "QA",
  "RW",
  "SB",
  "SC",
  "SL",
  "SR",
  "ST",
  "SY",
  "TD",
  "TF",
  "TG",
  "TK",
  "TL",
  "TO",
  "TV",
  "UG",
  "VU",
  "YE",
  "ZW",
]);

/** Countries where a state, province or emirate is part of a deliverable address. */
const NEEDS_REGION = new Set([
  "AE",
  "AR",
  "AU",
  "BR",
  "CA",
  "CN",
  "ID",
  "IN",
  "IT",
  "JP",
  "MX",
  "MY",
  "NG",
  "US",
]);

export type AddressField = "name" | "line1" | "city" | "region" | "postalCode" | "country";

export function requiredAddressFields(country: string | null | undefined): AddressField[] {
  const fields: AddressField[] = ["name", "line1", "city", "country"];
  const code = country?.toUpperCase();
  if (code && NEEDS_REGION.has(code)) fields.push("region");
  if (!code || !NO_POSTAL_CODE.has(code)) fields.push("postalCode");
  return fields;
}

/** The first required field the address leaves blank, or null when it can be delivered to. */
export function missingAddressField(address: ShopAddress | null | undefined): AddressField | null {
  return requiredAddressFields(address?.country).find((field) => !address?.[field]?.trim()) ?? null;
}
