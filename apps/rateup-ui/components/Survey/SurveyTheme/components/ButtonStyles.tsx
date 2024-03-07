import {
  Stack,
  Text,
  NumberInput,
  Group,
  Divider,
  Flex,
  Box,
} from "@mantine/core";
import React from "react";
import { Button as ButtonType } from "../surveyTheme.types";
// import CustomColorPicker from "./customelements/CustomColorPicker";
// import CustomColorInput from "./customelements/CustomColorInput";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";
import { ContainedSelection } from "../../../input/ContainedInput/ContainedInput";
import { COORDINATESX, COORDINATESY } from "../../../../utils/constants";

function ButtonStyles({
  currentStyles,
  setCurrentstyles,
}: {
  currentStyles: ButtonType;
  setCurrentstyles: (key: string, value: any) => void;
}) {
  return (
    <>
      <Stack align="start" w={"100%"}>
        {/* <Divider label="Styles" variant="dashed" w={"100%"} /> */}
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
            // style={{ maxWidth: "100px" }}
          />
        </Group>

        {/* <Text mt={10} fw={500}>
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
        /> */}
        <Box className={"custom-color-picker-and-heading-container"}>
          <h2>Background Color</h2>
          <CustomColorPicker
            value={currentStyles?.styles?.backgroundColor}
            onChange={(e) => {
              setCurrentstyles("button", {
                ...currentStyles,
                styles: { ...currentStyles.styles, backgroundColor: e },
              });
            }}
          />
        </Box>

        {/* <Text mt={10} fw={500}>
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
        /> */}

        <Box className={"custom-color-picker-and-heading-container"}>
          <h2>Text Color</h2>
          <CustomColorPicker
            value={currentStyles?.styles?.color}
            onChange={(e) => {
              setCurrentstyles("button", {
                ...currentStyles,
                styles: { ...currentStyles.styles, color: e },
              });
            }}
          />
        </Box>

        <Box>
          <Text fw={500}>Button position</Text>
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
      </Stack>
    </>
  );
}

export default ButtonStyles;
