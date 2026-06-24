import { Select, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { sampleChoices } from "@/utils/constants/forms.ts";

import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";
import CustomSelectForMobile from "../components/CustomSelectForMobile/index.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

import classes from "../TakeSurvey.module.css";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function DDSSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices?.[selectedLanguage];
  const [selectedOp, setSelectedOp] = useState("");
  const selectedPreview = useSelectedPreview();
  const isMobile = useMediaQuery("(max-width: 480px)") || selectedPreview === "mobile";
  const { t: translations } = useTranslation();
  const takeSurveyLayoutWebDomNodeRef = useRef(null);

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
    const takeSurveyLayoutWebRootDiv = document.querySelector(".take-survey-layout-web-root-div");
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
