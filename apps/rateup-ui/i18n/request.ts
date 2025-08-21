import { set } from "lodash";
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  // Provide a static locale, fetch a user setting,
  // read from `cookies()`, `headers()`, etc.
  const locale = "en";
  // Todo:"Fix this"
  const output = Object.entries(
    (await import(`../dictionaries/${locale}.json`)).default,
  ).reduce((acc, [key, value]) => set(acc, key, value), {});
  return {
    locale,
    messages: output,
  };
});
