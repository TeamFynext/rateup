import { Stack, Text, NumberInput, Group, Divider } from "@mantine/core";
import React from "react";
import { Button as ButtonType } from "../surveyTheme.types";
import CustomColorPicker from "./customelements/CustomColorPicker";
import CustomColorInput from "./customelements/CustomColorInput";

function ButtonStyles({
  currentStyles,
  setCurrentstyles,
}: {
  currentStyles: ButtonType;
  setCurrentstyles: (key: string, value: any) => void;
}) {
  return (
    <>
      <Stack align="center" w={"100%"}>
        <Divider label="Styles" variant="dashed" w={"100%"} />
        <Group>
          <NumberInput
            min={0}
            max={50}
            defaultValue={18}
            placeholder="radius"
            label="Border Radius"
            name="borderRadius"
            value={currentStyles?.styles?.borderRadius}
            onChange={(e) => {
              setCurrentstyles("button", {
                ...currentStyles,
                styles: { ...currentStyles.styles, borderRadius: e },
              });
            }}
            style={{ maxWidth: "100px" }}
          />
        </Group>

        <Text mt={10} fw={500}>
          Choose background color
        </Text>
        <CustomColorPicker
          value={currentStyles?.styles?.backgroundColor}
          onChange={(e) => {
            setCurrentstyles("button", {
              ...currentStyles,
              styles: { ...currentStyles.styles, backgroundColor: e },
            });
          }}
        />
        <CustomColorInput
          value={currentStyles?.styles?.backgroundColor}
          onChange={(e) => {
            setCurrentstyles("button", {
              ...currentStyles,
              styles: { ...currentStyles.styles, backgroundColor: e },
            });
          }}
        />

        <Text mt={10} fw={500}>
          Choose text color
        </Text>
        <CustomColorPicker
          value={currentStyles?.styles?.color}
          onChange={(e) => {
            setCurrentstyles("button", {
              ...currentStyles,
              styles: { ...currentStyles.styles, color: e },
            });
          }}
        />
        <CustomColorInput
          value={currentStyles?.styles?.color}
          onChange={(e) => {
            setCurrentstyles("button", {
              ...currentStyles,
              styles: { ...currentStyles.styles, color: e },
            });
          }}
        />
      </Stack>
    </>
  );
}

export default ButtonStyles;
