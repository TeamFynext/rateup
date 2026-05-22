import i18n from "i18next";
import languageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import ar from "./locales/ar.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import hi from "./locales/hi.json";

export const i18CookieName = "i18next";
i18n
  .use(languageDetector) // Detects user language and caches it in a cookie
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // the translations
    // (tip move them in a JSON file and import them,
    // or even better, manage them via a UI: https://react.i18next.com/guides/multiple-translation-files#manage-your-translations-with-a-management-gui)
    resources: {
      en,
      ar,
      de,
      hi,
      fr,
    },
    fallbackLng: "en",
    supportedLngs: ["en", "ar", "de", "hi", "fr"],
    interpolation: {
      escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
    defaultNS: "translation",
  });

export default i18n;
