export default {
  locales: ["en", "ar", "de", "fr", "hi"],
  extract: {
    input: "src/**/*.{js,jsx,ts,tsx}",
    output: "src/locales/{{language}}.json",
    // i18next-icu picks the plural form inside the message and never looks up `_one`/`_other`
    // keys, so a `count` option must not fan a key out into suffixed variants.
    disablePlurals: true,
  },
};
