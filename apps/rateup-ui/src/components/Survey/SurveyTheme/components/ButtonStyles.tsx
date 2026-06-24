import { Box, Flex, Stack } from "@mantine/core";
import { useCallback } from "react";

import { COORDINATESX, COORDINATESY } from "@/utils/constants.ts";

import { ContainedSelection } from "../../../input/ContainedInput/ContainedInput.tsx";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker/index.tsx";
import { getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import { ThemeTabEnum } from "../SurveyTheme.enums";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext.tsx";

import styles from "./stylescomponent/StylesComponent.module.css";

function ButtonStyles() {
  const selectedPageTab = useSelectedPageTab();
  const surveyTheme = useSurveyThemeContextValue();
  const { button } = surveyTheme[getSurveyThemeKeyOf(selectedPageTab)];

  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const handleBackgroundColorChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "button-background-color-change",
      payload: value,
    });
  }, []);

  const handleTextColorChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "button-text-color-change",
      payload: value,
    });
  }, []);

  const handleXCoOrdinateChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "button-x-coordinate-change",
      payload: value,
    });
  }, []);

  const handleYCoOrdinateChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "button-y-coordinate-change",
      payload: value,
    });
  }, []);

  return (
    <Stack
      className={`${styles["style-inputs-container"]} style-inputs-container ${styles["button-styles-div"]}`}
    >
      <Box className={"custom-color-picker-and-heading-container"}>
        <h2>Background Color</h2>
        <CustomColorPicker
          value={button?.styles?.backgroundColor}
          onChange={handleBackgroundColorChange}
          withoutEyedropper
        />
      </Box>

      <Box className={"custom-color-picker-and-heading-container"}>
        <h2>Text Color</h2>
        <CustomColorPicker
          value={button?.styles?.color}
          onChange={handleTextColorChange}
          withoutEyedropper
        />
      </Box>

      {selectedPageTab === ThemeTabEnum.WELCOME && (
        <Box className={"styles-section-div button-position-styles-div"}>
          <h2>Button position</h2>
          <Flex gap={"sm"}>
            <ContainedSelection
              className={styles["button-position-input"]}
              data={COORDINATESX}
              placeholder="X axis"
              defaultValue={button?.position?.x ?? COORDINATESX?.[1]}
              onChange={handleXCoOrdinateChange}
              allowDeselect={false}
              label={"x axis"}
              comboboxProps={{
                portalProps: {
                  className: styles["button-position-input-container"],
                },
              }}
            />
            <ContainedSelection
              className={styles["button-position-input"]}
              data={COORDINATESY}
              placeholder="Y axis"
              defaultValue={button?.position?.y ?? COORDINATESY?.[3]}
              onChange={handleYCoOrdinateChange}
              allowDeselect={false}
              label={"y axis"}
              comboboxProps={{
                portalProps: {
                  className: styles["button-position-input-container"],
                },
              }}
            />
          </Flex>
        </Box>
      )}
    </Stack>
  );
}

export default ButtonStyles;
