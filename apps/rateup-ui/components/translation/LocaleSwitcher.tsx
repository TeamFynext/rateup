import { useExtracted, useLocale } from "next-intl";

import LocaleSwitcherSelect from "./LocaleSwitcherSelect";

export default function LocaleSwitcher() {
  const t = useExtracted("LocaleSwitcher");
  const locale = useLocale();

  return (
    <LocaleSwitcherSelect
      defaultValue={locale}
      items={[
        {
          value: "en",
          label: t("English"),
        },
        {
          value: "ar",
          label: t("العربية"),
        },
        {
          value: "de",
          label: t("Deutsch"),
        },
        {
          value: "fr",
          label: t("Français"),
        },
        {
          value: "hi",
          label: t("हिन्दी"),
        },
      ]}
      label={t("Label")}
    />
  );
}
