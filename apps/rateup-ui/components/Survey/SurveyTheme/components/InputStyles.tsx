import {
  Stack,
  Text,
  Divider,
  Button,
  Group,
  ScrollArea,
  Box,
} from "@mantine/core";

import React, { useCallback } from "react";
import { Input } from "../surveyTheme.types";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";

function InputStyles({
  currentStyles,
  setCurrentstyles,
}: {
  currentStyles: Input;
  setCurrentstyles: (key: string, value: any) => void;
}) {
  const handleColorPickerChange = useCallback(
    (valueObj) => {
      const { themeObjKey, propertyChanged, value } = valueObj;
      setCurrentstyles(themeObjKey, {
        ...currentStyles,
        [propertyChanged]: value,
      });
    },
    [currentStyles],
  );

  return (
    <>
      <Stack align="center" w={"100%"}>
        <Group justify="space-between" w={"100%"}>
          <Box className={"custom-color-picker-and-heading-container"}>
            <h2>Text Color</h2>
            <CustomColorPicker
              optionalDataObj={{
                themeObjKey: "input",
                propertyChanged: "primaryColor",
              }}
              value={currentStyles?.primaryColor}
              onChange={handleColorPickerChange}
            />
          </Box>
        </Group>
      </Stack>
    </>
  );
}

export default InputStyles;
