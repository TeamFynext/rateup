import { useCallback } from "react";
import { Box, Group, NumberInput, Select, Stack } from "@mantine/core";
import { FontWeights, getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import styles from "./stylescomponent/StylesComponent.module.css";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext";

function DescStyles() {
  const selectedPageTab = useSelectedPageTab();
  const surveyTheme = useSurveyThemeContextValue();
  const { subtitle } = surveyTheme[getSurveyThemeKeyOf(selectedPageTab)];

  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const handleColorChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "subtitle-color-change",
      payload: value,
    });
  }, []);

  const handleFontWeightChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "subtitle-font-weight-change",
      payload: value,
    });
  }, []);

  const handleFontSizeChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "subtitle-font-size-change",
      payload: value,
    });
  }, []);

  return (
    <>
      <Stack align="start" w={"100%"} gap={"1rem"}>
        <Group wrap="nowrap" gap={"xs"}>
          <Select
            label="Font weight"
            name="fontWeight"
            data={FontWeights}
            value={subtitle?.styles?.fontWeight}
            classNames={{ label: styles["label"] }}
            onChange={handleFontWeightChange}
          />
          <NumberInput
            min={10}
            max={100}
            defaultValue={18}
            placeholder="size"
            label="Font Size"
            name="fontSize"
            classNames={{ label: styles["label"] }}
            value={subtitle?.styles?.fontSize}
            onChange={handleFontSizeChange}
          />
        </Group>
        <Box className={"custom-color-picker-and-heading-container"}>
          <h2>Text Color</h2>
          <CustomColorPicker
            value={subtitle?.styles?.color}
            onChange={handleColorChange}
          />
        </Box>
      </Stack>
    </>
  );
}

export default DescStyles;
