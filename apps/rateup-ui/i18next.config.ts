export default {
  locales: ["en", "ar", "de", "hi", "fr"],
  extract: {
    input: "src/**/*.{js,jsx,ts,tsx}",
    output: "src/locales/{{language}}.json",
  },
};
