import {
  Select,
  Stack,
  Text,
  NumberInput,
  Divider,
  Group,
  Box,
} from "@mantine/core";
import { Title } from "../surveyTheme.types";
import { FontWeights } from "../SurveyTheme.constants";

import styles from "./stylescomponent/StylesComponent.module.css";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";

function HeaderStyles({
  currentStyles,
  setCurrentstyles,
}: {
  currentStyles: Title;
  setCurrentstyles: (key: string, value: any) => void;
}) {
  return (
    <>
      <Stack align="start" w={"100%"}>
        {/* <Divider label="Styles" variant="dashed" w={"100%"} /> */}
        <Group wrap="nowrap" gap={"xs"} w={"100%"}>
          <Select
            label="Font weight"
            name="fontWeight"
            data={FontWeights}
            style={{ flex: 1 }}
            value={currentStyles?.styles?.fontWeight}
            classNames={{ label: styles["label"] }}
            onChange={(e) => {
              setCurrentstyles("title", {
                ...currentStyles,
                styles: { ...currentStyles.styles, fontWeight: e },
              });
            }}
          />
          <NumberInput
            min={10}
            max={100}
            style={{ flex: 1 }}
            defaultValue={18}
            placeholder="size"
            label="Font Size"
            name="fontSize"
            classNames={{ label: styles["label"] }}
            value={currentStyles?.styles?.fontSize}
            onChange={(e) => {
              setCurrentstyles("title", {
                ...currentStyles,
                styles: { ...currentStyles.styles, fontSize: e },
              });
            }}
          />
        </Group>
        {/* <CustomColorPicker
          value={currentStyles?.styles?.color}
          onChange={(e) => {
            setCurrentstyles("title", {
              ...currentStyles,
              styles: { ...currentStyles.styles, color: e },
            });
          }}
        />
        <CustomColorInput
          value={currentStyles?.styles?.color}
          onChange={(e) => {
            setCurrentstyles("title", {
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
              setCurrentstyles("title", {
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

export default HeaderStyles;
