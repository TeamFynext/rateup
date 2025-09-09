import { getRequestConfig } from "next-intl/server";

import { getUserLocale } from "@/utils/service/locale";

export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  return {
    locale,
    messages: (await import(`../dictionaries/${locale}.json`)).default,
  };
});
