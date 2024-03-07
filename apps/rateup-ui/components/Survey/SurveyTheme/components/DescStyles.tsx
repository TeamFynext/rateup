import {
  Select,
  Stack,
  Text,
  NumberInput,
  Divider,
  Group,
  Box,
} from "@mantine/core";

import React from "react";
import { Subtitle } from "../surveyTheme.types";
import { FontWeights } from "../SurveyTheme.constants";
// import CustomColorPicker from "./customelements/CustomColorPicker";
// import CustomColorInput from "./customelements/CustomColorInput";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";
import styles from "./stylescomponent/StylesComponent.module.css";

function DescStyles({
  currentStyles,
  setCurrentstyles,
}: {
  currentStyles: Subtitle;
  setCurrentstyles: (key: string, value: any) => void;
}) {
  return (
    <>
      <Stack align="start" w={"100%"}>
        {/* <Divider label="Styles" variant="dashed" w={"100%"} /> */}
        <Group wrap="nowrap" gap={"xs"}>
          <Select
            label="Font weight"
            name="fontWeight"
            data={FontWeights}
            // maw={120}
            value={currentStyles?.styles?.fontWeight}
            classNames={{ label: styles["label"] }}
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
            // maw={120}
            defaultValue={18}
            placeholder="size"
            label="Font Size"
            name="fontSize"
            classNames={{ label: styles["label"] }}
            value={currentStyles?.styles?.fontSize}
            onChange={(e) => {
              setCurrentstyles("subtitle", {
                ...currentStyles,
                styles: { ...currentStyles.styles, fontSize: e },
              });
            }}
          />
        </Group>
        {/* <Text mt={10} fw={500}>
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
        /> */}
        <Box className={"custom-color-picker-and-heading-container"}>
          <h2>Text Color</h2>
          <CustomColorPicker
            value={currentStyles?.styles?.color}
            onChange={(e) => {
              setCurrentstyles("subtitle", {
                ...currentStyles,
                styles: { ...currentStyles.styles, color: e },
              });
            }}
          />
        </Box>
      </Stack>
    </>
  );
}

export default DescStyles;
