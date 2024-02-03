import {
  Select,
  Stack,
  Text,
  NumberInput,
  Divider,
  ScrollArea,
} from "@mantine/core";

import React from "react";
import { Subtitle } from "../surveyTheme.types";
import { FontWeights } from "../SurveyTheme.constants";
import CustomColorPicker from "./customelements/CustomColorPicker";
import CustomColorInput from "./customelements/CustomColorInput";

function DescStyles({
  currentStyles,
  setCurrentstyles,
}: {
  currentStyles: Subtitle;
  setCurrentstyles: (key: string, value: any) => void;
}) {
  return (
    <ScrollArea h={"51vh"} w={"100%"}>
      <Stack align="center" w={"100%"}>
        <Divider label="Styles" variant="dashed" w={"100%"} />
        <Select
          label="Font weight"
          data={FontWeights}
          style={{ maxWidth: "150px" }}
          value={currentStyles?.styles?.fontWeight}
          onChange={(e) => {
            setCurrentstyles("subtitle", {
              ...currentStyles,
              styles: { ...currentStyles.styles, fontWeight: e },
            });
          }}
        />
        <NumberInput
          min={10}
          max={100}
          defaultValue={18}
          placeholder="size"
          label="Font Size"
          name="fontSize"
          style={{ maxWidth: "150px" }}
          value={currentStyles?.styles?.fontSize}
          onChange={(e) => {
            setCurrentstyles("subtitle", {
              ...currentStyles,
              styles: { ...currentStyles.styles, fontSize: e },
            });
          }}
        />
        <Text mt={10} fw={500}>
          Choose text color
        </Text>
        <CustomColorPicker
          value={currentStyles?.styles?.color}
          onChange={(e) => {
            setCurrentstyles("subtitle", {
              ...currentStyles,
              styles: { ...currentStyles.styles, color: e },
            });
          }}
        />
        <CustomColorInput
          value={currentStyles?.styles?.color}
          onChange={(e) => {
            setCurrentstyles("subtitle", {
              ...currentStyles,
              styles: { ...currentStyles.styles, color: e },
            });
          }}
        />
      </Stack>
    </ScrollArea>
  );
}

export default DescStyles;
