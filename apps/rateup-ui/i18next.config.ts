export default {
  locales: ["en", "ar", "de", "fr", "hi"],
  extract: {
    input: "src/**/*.{js,jsx,ts,tsx}",
    output: "src/locales/{{language}}.json",
  },
};
