import { IconMail } from "@tabler/icons-react";
import type { CountryCode } from "libphonenumber-js";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

import type { QuestionFormFeatures } from "@/components/Survey/Question/QuestionExtraProps/questionForm.ts";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { asAnswer } from "@/utils/response.ts";

import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";
import { useThemePrimaryColor } from "./useThemePrimaryColor.ts";

/** Per-field configuration of a Contact question. */
const ContactForm = ({ features }: { features?: Record<string, QuestionFormFeatures> }) => {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const selectedFeature = features?.[selectedLanguage];
  const themePrimaryColor = useThemePrimaryColor();
  const { t: translations } = useTranslation();
  return (
    <div className="flex w-full flex-col gap-5">
      {selectedFeature?.name?.isEnabled && (
        <div className="flex flex-col gap-2.5">
          <span style={{ color: themePrimaryColor }}>{selectedFeature?.name?.headText}</span>
          <FormPaperLayout>
            <Input
              placeholder={translations("Enter name")}
              value={asAnswer(response).name || ""}
              onChange={(e) => updateResponse({ ...asAnswer(response), name: e.target.value })}
              className="h-auto w-full border-none bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
              onClick={handleInputScrollIntoView}
            />
          </FormPaperLayout>
        </div>
      )}
      {selectedFeature?.phone?.isEnabled && (
        <div className="flex flex-col gap-2.5">
          <span style={{ color: themePrimaryColor }}>{selectedFeature?.phone?.headText}</span>
          <PhoneInput
            defaultCountry={(selectedFeature?.phone?.defaultCountryCode as CountryCode) || "IN"}
            international
            countryCallingCodeEditable={false}
            placeholder={translations("Enter phone number")}
            value={asAnswer(response).phone || undefined}
            onChange={(value) => updateResponse({ ...asAnswer(response), phone: value })}
            className="not-prose w-full max-w-[500px]"
            onClick={handleInputScrollIntoView}
          />
        </div>
      )}
      {selectedFeature?.email?.isEnabled && (
        <div className="flex flex-col gap-2.5">
          <span style={{ color: themePrimaryColor }}>{selectedFeature?.email?.headText}</span>
          <FormPaperLayout>
            <div className="flex items-center gap-2">
              <IconMail size="1.2rem" className="shrink-0 text-muted-foreground" />
              <Input
                placeholder={translations("Enter email")}
                value={asAnswer(response).email || ""}
                onChange={(e) => updateResponse({ ...asAnswer(response), email: e.target.value })}
                className="h-auto w-full border-none bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
                onClick={handleInputScrollIntoView}
              />
            </div>
          </FormPaperLayout>
        </div>
      )}
    </div>
  );
};

export default ContactForm;
