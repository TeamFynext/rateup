import { useTranslation } from "react-i18next";

import i18n from "@/i18n.ts";

import LocaleSwitcherSelect from "./LocaleSwitcherSelect.tsx";

export default function LocaleSwitcher() {
  const { t } = useTranslation("LocaleSwitcher");

  return (
    <LocaleSwitcherSelect
      defaultValue={i18n.language}
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
