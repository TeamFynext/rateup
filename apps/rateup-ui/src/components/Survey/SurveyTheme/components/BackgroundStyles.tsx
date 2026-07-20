import { useCallback } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { cn } from "@/lib/utils.ts";

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
  const { bg, confettiEnabled } = surveyTheme[getSurveyThemeKeyOf(selectedPageTab)];

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

  const { bgColor, chooseBgRadioInputValue, imageUrl } = bg[selectedPreview + "Bg"];

  const isSurveyPageTab = selectedPageTab === ThemeTabEnum.SURVEY;
  const useSurveyBackground = !isSurveyPageTab && bg.useSurveyBackground;

  return (
    <div
      className={cn(
        "flex flex-col",
        styles["style-inputs-container"],
        "style-inputs-container background-style-inputs-div",
      )}
    >
      {selectedPageTab === ThemeTabEnum.THANKYOU && (
        <CustomSwitch
          className={styles["confetti-switch"]}
          checked={confettiEnabled}
          onChange={handleConfettiChange}
          label={!confettiEnabled ? "Enable Confetti" : "Disable Confetti"}
        />
      )}

      <div className="relative flex flex-col">
        {useSurveyBackground && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.6)", zIndex: 198 }}
          />
        )}
        <RadioGroup
          value={chooseBgRadioInputValue}
          onValueChange={handleChooseBackgroundRadioGroupChange}
          className="flex flex-row gap-5"
        >
          <label className="flex items-center gap-2">
            <RadioGroupItem value="color" />
            Color
          </label>
          <label className="flex items-center gap-2">
            <RadioGroupItem value="image" />
            Image
          </label>
        </RadioGroup>

        {chooseBgRadioInputValue === "color" && (
          <div className="custom-color-picker-and-heading-container">
            <CustomColorPicker
              value={bgColor}
              onChange={handleBgColorPickerChange}
              withoutEyedropper
            />
          </div>
        )}

        {chooseBgRadioInputValue === "image" && (
          <div className="flex flex-col">
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
          </div>
        )}
      </div>
    </div>
  );
}

export default BackgroundStyles;
