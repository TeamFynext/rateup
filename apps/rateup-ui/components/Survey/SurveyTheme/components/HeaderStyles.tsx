import { useCallback } from "react";
import { Box, Group, NumberInput, Select, Stack } from "@mantine/core";
import { Title } from "../surveyTheme.types";
import { ThemeTabEnum } from "../SurveyTheme.enums";
import { FontWeights } from "../SurveyTheme.constants";
import styles from "./stylescomponent/StylesComponent.module.css";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";

function HeaderStyles({
  currentStyles,
  setCurrentstyles,
  selectedTab,
}: {
  currentStyles: Title;
  setCurrentstyles: (key: string, value: any) => void;
  selectedTab: string;
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
    <Stack align="start" w={"100%"} gap={"1.5rem"}>
      {selectedTab !== ThemeTabEnum.SURVEY && (
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
      )}
      <Box className={"custom-color-picker-and-heading-container"}>
        <h2>Text Color</h2>
        <CustomColorPicker
          optionalDataObj={{ themeObjKey: "title", propertyChanged: "color" }}
          value={currentStyles?.styles?.color}
          onChange={handleColorPickerChange}
        />
      </Box>
    </Stack>
  );
}

export default HeaderStyles;
