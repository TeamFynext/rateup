import { Box, Group, NumberInput, Select, Stack } from "@mantine/core";
import { useCallback } from "react";

import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker/index.tsx";
import { FontWeights, getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext.tsx";

import styles from "./stylescomponent/StylesComponent.module.css";

function HeaderStyles() {
  const selectedPageTab = useSelectedPageTab();
  const surveyTheme = useSurveyThemeContextValue();
  const { title } = surveyTheme[getSurveyThemeKeyOf(selectedPageTab)];

  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const handleColorChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "title-color-change",
      payload: value,
    });
  }, []);

  const handleFontWeightChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "title-font-weight-change",
      payload: value,
    });
  }, []);

  const handleFontSizeChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "title-font-size-change",
      payload: value,
    });
  }, []);

  return (
    <Stack
      className={`${styles["style-inputs-container"]} ${styles["header-styles"]} style-inputs-container header-style-inputs-container`}
    >
      <Box className={"custom-color-picker-and-heading-container"}>
        <h2>Text Color</h2>
        <CustomColorPicker
          value={title.styles.color}
          onChange={handleColorChange}
          withoutEyedropper
        />
      </Box>
      <Group wrap="nowrap" gap={"xs"}>
        <Select
          label="Font weight"
          name="fontWeight"
          data={FontWeights}
          value={title.styles.fontWeight}
          classNames={{ label: styles["label"] }}
          onChange={handleFontWeightChange}
          comboboxProps={{
            portalProps: {
              className: styles["font-weight-popover-container"],
            },
          }}
        />
        <NumberInput
          min={10}
          max={100}
          defaultValue={18}
          placeholder="size"
          label="Font Size"
          name="fontSize"
          classNames={{ label: styles["label"] }}
          value={title.styles.fontSize}
          onChange={handleFontSizeChange}
        />
      </Group>
    </Stack>
  );
}

export default HeaderStyles;
