import { Box, Stack } from "@mantine/core";
import { Title } from "../surveyTheme.types";

import { useCallback } from "react";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";

function HeaderStyles({
  currentStyles,
  setCurrentstyles,
}: {
  currentStyles: Title;
  setCurrentstyles: (key: string, value: any) => void;
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
      <Stack align="start" w={"100%"} gap={"1.5rem"}>
        <Box className={"custom-color-picker-and-heading-container"}>
          <h2>Text Color</h2>
          <CustomColorPicker
            optionalDataObj={{ themeObjKey: "title", propertyChanged: "color" }}
            value={currentStyles?.styles?.color}
            onChange={handleColorPickerChange}
          />
        </Box>
      </Stack>
    </>
  );
}

export default HeaderStyles;
