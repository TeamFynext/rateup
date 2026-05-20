"use client";

import { useContext, useEffect, useRef, useState } from "react";

import { luminance, useMantineTheme } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useOs } from "@mantine/hooks";
import { IconCalendarEvent } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { useIsSurveyThemePreview } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext.tsx";
import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";
import classes from "../TakeSurvey.module.css";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

export function DateForm({ isPreview }: { isPreview?: boolean }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [value, setValue] = useState<Date | null>(null);
  const theme = useMantineTheme();
  const themePrimaryColor = theme.colors.primaryColor
    ? theme.colors.primaryColor[5]
    : "#1C518E";
  const primaryColor =
    luminance(themePrimaryColor) > 0.8
      ? `var(--mantine-color-gray-9)`
      : themePrimaryColor;

  const selectedPreview = useSelectedPreview();
  const os = useOs();
  const isMobile =
    os === "android" || os === "ios" || selectedPreview === "mobile";
  const isSurveyThemePreview = useIsSurveyThemePreview();
  const takeSurveyLayoutWebDomNodeRef = useRef(null);
  const { t: translations } = useTranslation();
  useEffect(() => {
    const takeSurveyLayoutWebRootDiv = document.querySelector(
      ".take-survey-layout-web-root-div",
    );
    takeSurveyLayoutWebDomNodeRef.current = takeSurveyLayoutWebRootDiv;
  }, []);

  return (
    <FormPaperLayout>
      <DatePickerInput
        value={isPreview ? value : response}
        onChange={isPreview ? setValue : updateResponse}
        placeholder={translations("Select date")}
        defaultLevel="decade"
        maw={400}
        mx="auto"
        dropdownType={isMobile ? "modal" : "popover"}
        modalProps={{
          centered: true,
          portalProps: {
            target:
              isSurveyThemePreview && takeSurveyLayoutWebDomNodeRef.current,
          },
        }}
        variant="unstyled"
        leftSection={<IconCalendarEvent size="1.2rem" color={primaryColor} />}
        classNames={{
          input: classes.input,
        }}
        styles={{
          calendarHeader: {
            color: primaryColor,
          },
          calendarHeaderControl: {
            color: primaryColor,
          },
        }}
      />
    </FormPaperLayout>
  );
}

