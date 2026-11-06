import { useTranslation } from "react-i18next";

import { useUpdateUserLanguageMutation } from "@/backend/user/user.query";
import i18n from "@/i18n.ts";

import LocaleSwitcherSelect from "./LocaleSwitcherSelect.tsx";

export default function LocaleSwitcher() {
  const { t } = useTranslation("LocaleSwitcher");
  // The cookie keeps this browser in the chosen language; `prefLanguage` is what a new
  // browser reads it back from.
  const updateLanguage = useUpdateUserLanguageMutation(() => {});

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
      onLocaleChange={(locale) => updateLanguage.mutate({ prefLanguage: locale })}
    />
  );
}
