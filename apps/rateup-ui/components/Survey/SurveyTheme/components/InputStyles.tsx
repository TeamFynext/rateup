import { Stack, Text, Divider, Button, Group, ScrollArea } from "@mantine/core";

import React from "react";
import { Input } from "../surveyTheme.types";
import CustomColorSwatch from "./customelements/CustomColorSwatch";
import { defaultThemeName } from "../SurveyTheme.enums";

function InputStyles({
  currentStyles,
  setCurrentstyles,
}: {
  currentStyles: Input;
  setCurrentstyles: (key: string, value: any) => void;
}) {
  return (
    <>
      <Stack align="center" w={"100%"}>
        <Divider label="Styles" variant="dashed" w={"100%"} />
        <Group justify="space-between" w={"100%"}>
          <Text c={"dimmed"} fz="xs">
            Choose component color
          </Text>
          <Button
            bg={"var(--tertiary-color)"}
            size="compact-sm"
            fz={"xs"}
            onClick={() => {
              setCurrentstyles("input", {
                ...currentStyles,
                primaryColor: defaultThemeName.RATEUP_BLUE,
              });
            }}
          >
            Reset
          </Button>
        </Group>

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
    </>
  );
}

export default InputStyles;
