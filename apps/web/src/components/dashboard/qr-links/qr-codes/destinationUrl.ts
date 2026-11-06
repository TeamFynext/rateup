import type { TFunction } from "i18next";
import { z } from "zod";

/** Mirrors `targetLink` in rateup-api's generateQr.schema.ts. */
export function destinationUrlSchema(t: TFunction) {
  const message = t("Enter a full link starting with https://");
  return z
    .string()
    .trim()
    .max(2048, t("That link is too long."))
    .pipe(z.url(message))
    .refine((value) => value.startsWith("http://") || value.startsWith("https://"), message);
}
