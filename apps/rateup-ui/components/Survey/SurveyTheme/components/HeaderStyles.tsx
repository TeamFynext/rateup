import { Box, Group, NumberInput, Select, Stack } from "@mantine/core";
import { Subtitle, Title } from "../surveyTheme.types";
import { useCallback } from "react";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";
import { FontWeights } from "../SurveyTheme.constants";
import styles from "./stylescomponent/StylesComponent.module.css";
import { ThemeTabEnum } from "../SurveyTheme.enums";

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
    <>
      <Stack align="start" w={"100%"} gap={"1rem"}>
        <Group wrap="nowrap" gap={"xs"}>
          <Select
            label="Font weight"
            name="fontWeight"
            data={FontWeights}
            // maw={120}
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
            // maw={120}
            defaultValue={18}
            placeholder="size"
            label="Font Size"
            name="fontSize"
            classNames={{ label: styles["label"] }}
            value={currentStyles?.styles?.fontSize}
            onChange={(e: number) => {
              const subtitleFontSizeObj =
                selectedTab === ThemeTabEnum.SURVEY
                  ? { subtitleFontSize: 0.8 * e }
                  : {};
              setCurrentstyles("title", {
                ...currentStyles,
                styles: { ...currentStyles.styles, fontSize: e },
                ...subtitleFontSizeObj,
              });
            }}
          />
        </Group>
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
