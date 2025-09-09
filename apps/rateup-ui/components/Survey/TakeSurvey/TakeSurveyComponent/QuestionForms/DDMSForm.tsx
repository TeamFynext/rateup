"use client";

import { useContext, useEffect, useRef, useState } from "react";

import {
  isLightColor,
  luminance,
  MultiSelect,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useTranslations } from "next-intl";

import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import { sampleChoices } from "../../../../../utils/constants/forms";
import { useIsSurveyThemePreview } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext";
import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext";
import CustomMultiselectForMobile from "../components/CustomMultiselectForMobile";
import classes from "../TakeSurvey.module.css";
import FormPaperLayout from "./layout/FormPaperLayout";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function DDMSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const selectedPreview = useSelectedPreview();
  const isMobile =
    useMediaQuery("(max-width: 480px)") || selectedPreview === "mobile";

  const takeSurveyLayoutWebDomNodeRef = useRef(null);
  const isSurveyThemePreview = useIsSurveyThemePreview();

  const mantineTheme = useMantineTheme();
  const themePrimaryColor = mantineTheme.colors.primaryColor
    ? mantineTheme.colors.primaryColor[5]
    : "#1C518E";

  const pillBgColor =
    luminance(themePrimaryColor) > 0.8
      ? `var(--mantine-color-gray-7)`
      : themePrimaryColor;
  const pillTextColor = isLightColor(pillBgColor) ? "#000000" : "#FFFFFF";

  const [selectedOp, setSelectedOp] = useState([]);
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
      ? previewChoices?.[selectedLanguage]
      : sampleChoices;

  const data = options?.map((op) => op?.value);
  const translations = useTranslations();
  useEffect(() => {
    if (response) {
      setSelectedOp(response?.map((r) => r?.value));
    }
  }, [response]);

  useEffect(() => {
    const takeSurveyLayoutWebRootDiv = document.querySelector(
      ".take-survey-layout-web-root-div",
    );
    takeSurveyLayoutWebDomNodeRef.current = takeSurveyLayoutWebRootDiv;
  }, []);

  const handleSelectedOp = (values) => {
    const res = values?.map((val) => options?.find((op) => op?.value === val));
    updateResponse(res);
  };
  const theme = useMantineTheme();
  const pos = isMobile ? "top" : "bottom";
  return !isMobile ? (
    <FormPaperLayout>
      <MultiSelect
        data={data}
        value={selectedOp}
        onChange={handleSelectedOp}
        placeholder={translations("Select one or more / type in to search")}
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
          pill: {
            color: pillTextColor,
            backgroundColor: pillBgColor,
          },
        }}
        searchable
      />
    </FormPaperLayout>
  ) : (
    <CustomMultiselectForMobile
      value={selectedOp}
      data={data}
      onChange={handleSelectedOp}
      placeholder={translations("Select one or more")}
      portalProps={{
        target: takeSurveyLayoutWebDomNodeRef.current,
      }}
    />
  );
}
