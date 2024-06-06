import { Box, Flex, Slider, Stack } from "@mantine/core";
import { useCallback } from "react";
import { Button as ButtonType } from "../surveyTheme.types";

import { COORDINATESX, COORDINATESY } from "../../../../utils/constants";
import { ContainedSelection } from "../../../input/ContainedInput/ContainedInput";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";
import { ThemeTabEnum } from "../SurveyTheme.enums";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext";
import { getSurveyThemeKeyOf } from "../SurveyTheme.constants";

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

  const handleBorderRadiusChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "button-border-radius-change",
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
    <>
      <Stack align="start" w={"100%"} gap={"1rem"}>
        <Box className={"custom-color-picker-and-heading-container"}>
          <h2>Background Color</h2>
          <CustomColorPicker
            value={button?.styles?.backgroundColor}
            onChange={handleBackgroundColorChange}
          />
        </Box>

        <Box className={"custom-color-picker-and-heading-container"}>
          <h2>Text Color</h2>
          <CustomColorPicker
            value={button?.styles?.color}
            onChange={handleTextColorChange}
          />
        </Box>

        {selectedPageTab === ThemeTabEnum.WELCOME && (
          <Box className={"styles-section-div"}>
            <h2>Button position</h2>
            <Flex gap={"sm"}>
              <ContainedSelection
                data={COORDINATESX}
                placeholder="X axis"
                defaultValue={button?.position?.x ?? COORDINATESX?.[1]}
                onChange={handleXCoOrdinateChange}
                allowDeselect={false}
                label={"x axis"}
              />
              <ContainedSelection
                data={COORDINATESY}
                placeholder="Y axis"
                defaultValue={button?.position?.y ?? COORDINATESY?.[3]}
                onChange={handleYCoOrdinateChange}
                allowDeselect={false}
                label={"y axis"}
              />
            </Flex>
          </Box>
        )}
      </Stack>
    </>
  );
}

export default ButtonStyles;
