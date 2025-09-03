import { useLocale, useTranslations } from "next-intl";

import LocaleSwitcherSelect from "./LocaleSwitcherSelect";

export default function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();

  return (
    <LocaleSwitcherSelect
      defaultValue={locale}
      items={[
        {
          value: "en",
          label: t("en"),
        },
        {
          value: "ar",
          label: t("ar"),
        },
        {
          value: "de",
          label: t("de"),
        },
        {
          value: "fr",
          label: t("fr"),
        },
        {
          value: "hi",
          label: t("hi"),
        },
      ]}
      label={t("Label")}
    />
  );
}
