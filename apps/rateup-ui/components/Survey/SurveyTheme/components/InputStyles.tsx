import { Box, Group, Stack } from "@mantine/core";

import { useCallback } from "react";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";
import { getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext";

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
    <>
      <Stack align="center" w={"100%"}>
        <Group justify="space-between" w={"100%"}>
          <Box className={"custom-color-picker-and-heading-container"}>
            <h2>Text Color</h2>
            <CustomColorPicker
              value={input?.primaryColor}
              onChange={handleColorPickerChange}
            />
          </Box>
        </Group>
      </Stack>
    </>
  );
}

export default InputStyles;
