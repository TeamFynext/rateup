"use client";

import { useCallback } from "react";

import { Box, Group, Stack } from "@mantine/core";

import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";
import { getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext";
import styles from "./stylescomponent/StylesComponent.module.css";

function InputStyles() {
  const selectedPageTab = useSelectedPageTab();
  const surveyTheme = useSurveyThemeContextValue();
  const { input } = surveyTheme[getSurveyThemeKeyOf(selectedPageTab)];

  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const handleColorPickerChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "input-color-change",
      payload: value,
    });
  }, []);

  return (
    <Stack
      className={`${styles["style-inputs-container"]} style-inputs-container`}
    >
      <Group justify="space-between" w={"100%"}>
        <Box className={"custom-color-picker-and-heading-container"} w={"100%"}>
          <h2>Color</h2>
          <CustomColorPicker
            value={input?.primaryColor}
            onChange={handleColorPickerChange}
            withoutEyedropper
          />
        </Box>
      </Group>
    </Stack>
  );
}

export default InputStyles;
