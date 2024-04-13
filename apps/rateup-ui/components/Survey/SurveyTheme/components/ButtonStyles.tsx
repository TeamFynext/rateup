import { Box, Flex, Slider, Stack } from "@mantine/core";
import { useCallback } from "react";
import { Button as ButtonType } from "../surveyTheme.types";

import { COORDINATESX, COORDINATESY } from "../../../../utils/constants";
import { ContainedSelection } from "../../../input/ContainedInput/ContainedInput";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";
import { ThemeTabEnum } from "../SurveyTheme.enums";

function ButtonStyles({
  currentStyles,
  setCurrentstyles,
  selectedTab,
}: {
  currentStyles: ButtonType;
  setCurrentstyles: (key: string, value: any) => void;
  selectedTab: ThemeTabEnum;
}) {
  const handleColorPickerChange = useCallback(
    (valueObj) => {
      const { themeObjKey, propertyChanged, value } = valueObj;
      if (currentStyles?.styles)
        setCurrentstyles(themeObjKey, {
          ...currentStyles,
          styles: { ...currentStyles.styles, [propertyChanged]: value },
        });
    },
    [currentStyles],
  );

  return (
    <>
      <Stack align="start" w={"100%"} gap={"1rem"}>
        <Box className={"custom-color-picker-and-heading-container"}>
          <h2>Background Color</h2>
          <CustomColorPicker
            // we can get this optionalDataObj in onChange handler
            optionalDataObj={{
              themeObjKey: "button",
              propertyChanged: "backgroundColor",
            }}
            value={currentStyles?.styles?.backgroundColor}
            onChange={handleColorPickerChange}
          />
        </Box>

        <Box className={"custom-color-picker-and-heading-container"}>
          <h2>Text Color</h2>
          <CustomColorPicker
            optionalDataObj={{
              themeObjKey: "button",
              propertyChanged: "color",
            }}
            value={currentStyles?.styles?.color}
            onChange={handleColorPickerChange}
          />
        </Box>

        <Box className={"styles-section-div"}>
          <h2>Border Radius</h2>
          <Slider
            min={0}
            max={50}
            defaultValue={18}
            value={currentStyles?.styles?.borderRadius}
            onChange={(e) => {
              setCurrentstyles("button", {
                ...currentStyles,
                styles: { ...currentStyles.styles, borderRadius: e },
              });
            }}
          />
        </Box>

        {selectedTab === ThemeTabEnum.WELCOME && (
          <Box className={"styles-section-div"}>
            <h2>Button position</h2>
            <Flex gap={"sm"}>
              <ContainedSelection
                data={COORDINATESX}
                placeholder="X axis"
                defaultValue={currentStyles?.position?.x ?? COORDINATESX?.[1]}
                onChange={(e) => {
                  setCurrentstyles("button", {
                    ...currentStyles,
                    position: { ...currentStyles.position, ...{ x: e } },
                  });
                }}
                allowDeselect={false}
                label={"x axis"}
              />
              <ContainedSelection
                data={COORDINATESY}
                placeholder="Y axis"
                defaultValue={currentStyles?.position?.y ?? COORDINATESY?.[3]}
                onChange={(e) => {
                  setCurrentstyles("button", {
                    ...currentStyles,
                    position: { ...currentStyles.position, ...{ y: e } },
                  });
                }}
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
