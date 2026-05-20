"use client";

import { useCallback } from "react";

import { Box, Group, Overlay, Radio, RadioGroup, Stack } from "@mantine/core";

import LocalOrUnsplashImagePicker from "../../../LocalOrUnsplashImagePicker/index.tsx";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker/index.tsx";
import { getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import { ThemeTabEnum } from "../SurveyTheme.enums";
import {
  useSelectedPageTab,
  useSelectedPreview,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext.tsx";
import CustomSwitch from "./stylescomponent/CustomSwitch/index.tsx";
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

  const { bgColor, chooseBgRadioInputValue, imageUrl } =
    bg[selectedPreview + "Bg"];

  const isSurveyPageTab = selectedPageTab === ThemeTabEnum.SURVEY;
  const useSurveyBackground = !isSurveyPageTab && bg.useSurveyBackground;

  return (
    <Stack
      className={`${styles["style-inputs-container"]} style-inputs-container background-style-inputs-div`}
    >
      {selectedPageTab === ThemeTabEnum.THANKYOU && (
        <CustomSwitch
          className={styles["confetti-switch"]}
          checked={confettiEnabled}
          onChange={handleConfettiChange}
          label={!confettiEnabled ? "Enable Confetti" : "Disable Confetti"}
        />
      )}

      <Stack style={{ position: "relative" }}>
        {useSurveyBackground && <Overlay color="#FFFFFF" zIndex={198} />}
        <RadioGroup
          value={chooseBgRadioInputValue}
          onChange={handleChooseBackgroundRadioGroupChange}
        >
          <Group gap={"1.25rem"}>
            <Radio value={"color"} label="Color" />
            <Radio value={"image"} label="Image" />
          </Group>
        </RadioGroup>

        {chooseBgRadioInputValue === "color" && (
          <Box className={"custom-color-picker-and-heading-container"}>
            <CustomColorPicker
              value={bgColor}
              onChange={handleBgColorPickerChange}
              withoutEyedropper
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
