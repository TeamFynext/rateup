import { IconMail } from "@tabler/icons-react";
import { useContext, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { asAnswer } from "@/utils/response.ts";

import FormPaperLayout from "./layout/FormPaperLayout.tsx";
import { useThemePrimaryColor } from "./useThemePrimaryColor.ts";

export function EmailPhoneForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateResponse({ ...asAnswer(response), email: e.target.value });
  };
  const { t: translations } = useTranslation();
  const emailRef = useRef<HTMLInputElement>(null);
  const themePrimaryColor = useThemePrimaryColor();
  return (
    <div className="flex flex-col gap-4">
      <FormPaperLayout onClick={() => emailRef.current?.focus()}>
        <div className="flex items-center gap-2">
          <IconMail size="1.2rem" style={{ color: themePrimaryColor }} className="shrink-0" />
          <Input
            placeholder={translations("Enter your email")}
            ref={emailRef}
            value={asAnswer(response).email || ""}
            onChange={handleEmailChange}
            className="h-auto w-full border-none bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
          />
        </div>
      </FormPaperLayout>
      <PhoneInput
        defaultCountry="IN"
        international
        countryCallingCodeEditable={false}
        placeholder={translations("Enter phone number")}
        value={asAnswer(response).phone || undefined}
        onChange={(value) => updateResponse({ ...asAnswer(response), phone: value })}
        className="w-full max-w-[500px]"
      />
    </div>
  );
}
