import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import { sampleChoices } from "@/utils/constants/forms.ts";
import { asAnswer } from "@/utils/response.ts";

import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";
import CustomSelectForMobile from "../components/CustomSelectForMobile/index.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function DDSSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices?.[selectedLanguage];
  const [selectedOp, setSelectedOp] = useState("");
  const selectedPreview = useSelectedPreview();
  const isMobile = useIsMobile() || selectedPreview === "mobile";
  const { t: translations } = useTranslation();
  const takeSurveyLayoutWebDomNodeRef = useRef<HTMLElement | null>(null);

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
      ? previewChoices?.[selectedLanguage]
      : sampleChoices;

  const data = options?.map((op: Choice) => op?.value);
  const items = data?.map((op: string) => ({ value: op, label: op }));
  useEffect(() => {
    if (response) {
      setSelectedOp(asAnswer(response).value ?? "");
    }
  }, [response]);

  useEffect(() => {
    const takeSurveyLayoutWebRootDiv = document.querySelector(".take-survey-layout-web-root-div");
    takeSurveyLayoutWebDomNodeRef.current = takeSurveyLayoutWebRootDiv as HTMLElement | null;
  }, []);

  const handleSelectedOp = (value: string) => {
    const res = options?.find((op: Choice) => op?.value === value);
    updateResponse(res);
  };

  return !isMobile ? (
    <FormPaperLayout>
      <Combobox
        value={selectedOp || null}
        onValueChange={(value) => handleSelectedOp(value ?? "")}
        items={items}
      >
        <ComboboxInput
          placeholder={translations("Select one / type in to search")}
          className="w-full border-none bg-transparent px-0 shadow-none"
        />
        <ComboboxContent>
          <ComboboxEmpty>{translations("Nothing found...")}</ComboboxEmpty>
          <ComboboxList>
            {(item: { value: string; label: string }) => (
              <ComboboxItem key={item.value} value={item.value}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </FormPaperLayout>
  ) : (
    <CustomSelectForMobile
      value={selectedOp}
      data={data}
      placeholder={translations("Select one")}
      onChange={handleSelectedOp}
      portalTarget={takeSurveyLayoutWebDomNodeRef.current}
    />
  );
}
