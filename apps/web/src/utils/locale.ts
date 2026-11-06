/**
 * The locales the app ships translations for. `User.prefLanguage` holds both ISO codes and
 * older names like "English", so read the column through `normalizeLocale` and write codes.
 */
export const SUPPORTED_LOCALES = ["en", "ar", "de", "fr", "hi"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

const LEGACY_NAMES: Record<string, Locale> = {
  english: "en",
  arabic: "ar",
  العربية: "ar",
  german: "de",
  deutsch: "de",
  french: "fr",
  français: "fr",
  francais: "fr",
  hindi: "hi",
  हिन्दी: "hi",
};

/**
 * A stored or browser-supplied language as one of our locales, or null when it is not one we
 * translate. Accepts a code, a region-tagged code ("en-GB") or one of the older names.
 */
export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;

  const trimmed = value.trim().toLowerCase();
  const base = trimmed.split(/[-_]/)[0];

  if ((SUPPORTED_LOCALES as readonly string[]).includes(base)) return base as Locale;

  return LEGACY_NAMES[trimmed] ?? null;
}
