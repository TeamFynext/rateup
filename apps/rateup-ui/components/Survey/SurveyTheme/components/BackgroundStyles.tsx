import {
  Box,
  Checkbox,
  Group,
  Overlay,
  Radio,
  RadioGroup,
  Stack,
} from "@mantine/core";
import { ReactNode, useCallback } from "react";
import LocalOrUnsplashImagePicker from "../../../LocalOrUnsplashImagePicker";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";
import { getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import {
  useSelectedPageTab,
  useSelectedPreview,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext";
import CustomSwitch from "./stylescomponent/CustomSwitch";
import { ThemeTabEnum } from "../SurveyTheme.enums";
import styles from "./stylescomponent/StylesComponent.module.css";

function BackgroundStyles() {
  const selectedPageTab = useSelectedPageTab();
  const selectedPreview = useSelectedPreview();
  const surveyTheme = useSurveyThemeContextValue();
  const { bg, confettiEnabled } =
    surveyTheme[getSurveyThemeKeyOf(selectedPageTab)];

  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const handleBgColorPickerChange = useCallback(
    (value) => {
      surveyThemeDispatch({
        type: "bg-background-color-change",
        payload: value,
      });
    },
    [selectedPreview],
  );

  const handleDesktopBgImagePickerChange = useCallback((croppedImageObj) => {
    const { url = "", file = null } = croppedImageObj || {};
    surveyThemeDispatch({
      type: "bg-desktopBgImg-change",
      payload: {
        desktopBgImg: url,
        desktopBgImgFile: file,
      },
    });
  }, []);

  const handleMobileBgImagePickerChange = useCallback((croppedImageObj) => {
    const { url = "", file = null } = croppedImageObj || {};
    surveyThemeDispatch({
      type: "bg-mobileBgImg-change",
      payload: {
        mobileBgImg: url,
        mobileBgImgFile: file,
      },
    });
  }, []);

  const handleConfettiChange = useCallback((e) => {
    surveyThemeDispatch({
      type: "bg-confetti-change",
      payload: e.target.checked,
    });
  }, []);

  const handleChooseBackgroundRadioGroupChange = useCallback(
    (value) => {
      surveyThemeDispatch({
        type: "bg-choose-background-radio-change",
        payload: value,
      });
    },
    [selectedPreview],
  );

  const handleUseSurveyBackgroundCheckboxChange = useCallback((e) => {
    surveyThemeDispatch({
      type: "bg-use-survey-background-checkbox-change",
      payload: e.target.checked,
    });
  }, []);

  const { bgColor, chooseBgRadioInputValue, imageUrl } =
    bg[selectedPreview + "Bg"];

  const isSurveyPageTab = selectedPageTab === ThemeTabEnum.SURVEY;
  const useSurveyBackground = !isSurveyPageTab && bg.useSurveyBackground;

  return (
    <Stack align="start" w={"100%"} gap={"1rem"}>
      {selectedPageTab === ThemeTabEnum.THANKYOU && (
        <CustomSwitch
          checked={confettiEnabled}
          onChange={handleConfettiChange}
          label={!confettiEnabled ? "Enable Confetti" : "Disable Confetti"}
        />
      )}

      {!isSurveyPageTab && (
        <Checkbox
          checked={useSurveyBackground}
          onChange={handleUseSurveyBackgroundCheckboxChange}
          label="Use Survey Background"
        />
      )}

      <Stack style={{ position: "relative" }}>
        {useSurveyBackground && <Overlay color="#FFFFFF" />}
        <RadioGroup
          label="Choose the background"
          value={chooseBgRadioInputValue}
          onChange={handleChooseBackgroundRadioGroupChange}
        >
          <Group mt={"1rem"} gap={"1.25rem"}>
            <Radio value={"color"} label="Color" />
            <Radio value={"image"} label="Image" />
          </Group>
        </RadioGroup>

        {chooseBgRadioInputValue === "color" && (
          <Box className={"custom-color-picker-and-heading-container"}>
            <CustomColorPicker
              value={bgColor}
              onChange={handleBgColorPickerChange}
            />
          </Box>
        )}

        {chooseBgRadioInputValue === "image" && (
          <Stack>
            {selectedPreview === "desktop" && (
              <LocalOrUnsplashImagePicker
                value={imageUrl}
                label={"Desktop"}
                forDevice={"desktop"}
                onImageSelected={handleDesktopBgImagePickerChange}
              />
            )}

            {selectedPreview === "mobile" && (
              <LocalOrUnsplashImagePicker
                value={imageUrl}
                label={"Mobile"}
                forDevice={"mobile"}
                onImageSelected={handleMobileBgImagePickerChange}
              />
            )}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}

export default BackgroundStyles;

export function getFileName(url: string | File, isNewFile: boolean): ReactNode {
  if (isNewFile || typeof url === "string") return <>{url}</>;
  const pattern = /^[^-]+-/;
  return url.name.replace(pattern, "");
}
