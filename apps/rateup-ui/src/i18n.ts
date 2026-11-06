import i18n from "i18next";
import languageDetector from "i18next-browser-languagedetector";
import ICU from "i18next-icu";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";

const supportedLngs = ["en", "ar", "de", "hi", "fr"];

// English stays bundled: it is what the server renders, what the app first paints, and the
// fallback every other locale reads through while its own chunk is in flight. ar/de/fr/hi are
// left out of the main bundle (~800 KB of JSON) and fetched as one chunk per language the
// first time that language is actually requested.
const lazyLocales = resourcesToBackend(async (language: string, namespace: string) => {
  const resources = (await import(`./locales/${language}.json`)) as {
    default: Record<string, Record<string, string>>;
  };
  // One file per language holds every namespace, so pick the requested one out of it. The
  // module is cached after the first import, so the other namespaces resolve without a refetch.
  return resources.default[namespace] ?? {};
});

i18n
  .use(ICU)
  .use(lazyLocales)
  .use(languageDetector) // Detects user language and caches it in a cookie
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: { en },
    // `resources` only covers en, so keep asking the backend for the languages it misses.
    partialBundledLanguages: true,
    fallbackLng: "en",
    supportedLngs,
    // Resolve region tags (de-DE) to the base language we ship a file for, so the backend is
    // never asked for a locale that does not exist.
    load: "languageOnly",
    interpolation: {
      escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
    defaultNS: "translation",
    react: {
      // Loading is async now: render the English fallback and re-render when the language
      // lands, rather than suspending the tree on every namespace a route pulls in.
      useSuspense: false,
    },
  });

export default i18n;
