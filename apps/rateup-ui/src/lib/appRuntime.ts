/**
 * Translations and the SuperTokens SDK, for the app surfaces (dashboard, sign-in, admin, the
 * public tenant pages). Their layout routes await this in `beforeLoad`, which runs before any
 * child loader fetches or child chunk evaluates; the marketing site never loads either.
 *
 * Dynamic on purpose: a static import in a route's options would put both back in the entry
 * chunk that every page downloads.
 */
export async function loadAppRuntime() {
  await Promise.all([import("@/i18n"), import("@/lib/auth/supertokens")]);
}
