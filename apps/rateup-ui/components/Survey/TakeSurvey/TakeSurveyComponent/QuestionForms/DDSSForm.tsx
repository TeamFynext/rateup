import { useContext, useEffect, useRef, useState } from "react";

import { Select, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useTranslations } from "next-intl";

import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import { sampleChoices } from "../../../../../utils/constants/forms";
import { useIsSurveyThemePreview } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext";
import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext";
import CustomSelectForMobile from "../components/CustomSelectForMobile";
import classes from "../TakeSurvey.module.css";
import FormPaperLayout from "./layout/FormPaperLayout";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function DDSSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices?.[selectedLanguage];
  const [selectedOp, setSelectedOp] = useState("");
  const selectedPreview = useSelectedPreview();
  const isMobile =
    useMediaQuery("(max-width: 480px)") || selectedPreview === "mobile";
  const translations = useTranslations();
  const takeSurveyLayoutWebDomNodeRef = useRef(null);
  const isSurveyThemePreview = useIsSurveyThemePreview();
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
      ? previewChoices?.[selectedLanguage]
      : sampleChoices;

  const data = options?.map((op) => op?.value);
  useEffect(() => {
    if (response) {
      setSelectedOp(response.value);
    }
  }, [response]);

  useEffect(() => {
    const takeSurveyLayoutWebRootDiv = document.querySelector(
      ".take-survey-layout-web-root-div",
    );
    takeSurveyLayoutWebDomNodeRef.current = takeSurveyLayoutWebRootDiv;
  }, []);

  const handleSelectedOp = (value) => {
    const res = options?.find((op) => op?.value === value);
    updateResponse(res);
  };
  const theme = useMantineTheme();
  const pos = isMobile ? "top" : "bottom";

  return !isMobile ? (
    <FormPaperLayout>
      <Select
        placeholder={translations("Select one / type in to search")}
        data={data}
        value={selectedOp}
        onChange={handleSelectedOp}
        comboboxProps={{
          middlewares: {
            flip: false,
            shift: false,
          },
          position: pos,
        }}
        classNames={{
          input: classes.selectBox,
          root: classes.input,
        }}
        styles={{
          input: {
            backgroundColor: "transparent",
          },
          dropdown: {
            borderColor: `var(--mantine-color-${theme.primaryColor}-outline)`,
            zIndex: 999,
          },
        }}
        searchable
      />
    </FormPaperLayout>
  ) : (
    <CustomSelectForMobile
      value={selectedOp}
      data={data}
      placeholder={translations("Select one")}
      onChange={handleSelectedOp}
      portalProps={{
        target: takeSurveyLayoutWebDomNodeRef.current,
      }}
    />
  );
}
