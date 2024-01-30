import { Stack, Text, ScrollArea, Divider } from "@mantine/core";

import React from "react";
import { Input } from "../surveyTheme.types";
import CustomColorSwatch from "./customelements/CustomColorSwatch";

function InputStyles({
  currentStyles,
  setCurrentstyles,
}: {
  currentStyles: Input;
  setCurrentstyles: (key: string, value: any) => void;
}) {
  return (
    <ScrollArea h={"40vh"} w={"100%"}>
      <Stack align="center" w={"100%"}>
        <Divider label="Styles" variant="dashed" w={"100%"} />
        <Text mt={10} fw={500}>
          Choose component color
        </Text>
        <CustomColorSwatch
          value={currentStyles?.primaryColor}
          onChange={(e) => {
            setCurrentstyles("input", {
              ...currentStyles,
              primaryColor: e,
            });
          }}
        />
      </Stack>
    </ScrollArea>
  );
}

export default InputStyles;
