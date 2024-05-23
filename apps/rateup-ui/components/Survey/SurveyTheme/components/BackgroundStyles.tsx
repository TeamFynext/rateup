import { Box, Stack } from "@mantine/core";
import { ReactNode, useCallback } from "react";
import LocalOrUnsplashImagePicker from "../../../LocalOrUnsplashImagePicker";
import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker";
import { getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext";
import styles from "./stylescomponent/StylesComponent.module.css";
import CustomSwitch from "./stylescomponent/CustomSwitch";
import { ThemeTabEnum } from "../SurveyTheme.enums";

function BackgroundStyles() {
  const selectedPageTab = useSelectedPageTab();
  const surveyTheme = useSurveyThemeContextValue();
  const { bg, confettiEnabled } =
    surveyTheme[getSurveyThemeKeyOf(selectedPageTab)];

  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const handleColorPickerChange = useCallback((value) => {
    surveyThemeDispatch({
      type: "bg-background-color-change",
      payload: value,
    });
  }, []);

  const handleDesktopBgImagePickerChange = useCallback((croppedImageObj) => {
    const { url = "", file = null } = croppedImageObj || {};
    surveyThemeDispatch({
      type: "bg-desktopbg-change",
      payload: {
        desktopbg: url,
        desktopbgFile: file,
      },
    });
  }, []);

  const handleMobileBgImagePickerChange = useCallback((croppedImageObj) => {
    const { url = "", file = null } = croppedImageObj || {};
    surveyThemeDispatch({
      type: "bg-mobilebg-change",
      payload: {
        mobilebg: url,
        mobilebgFile: file,
      },
    });
  }, []);

  const handleConfettiChange = useCallback((e) => {
    surveyThemeDispatch({
      type: "bg-confetti-change",
      payload: e.target.checked,
    });
  }, []);

  return (
    <Stack align="start" w={"100%"} gap={"1rem"}>
      {selectedPageTab === ThemeTabEnum.THANKYOU && (
        <CustomSwitch
          checked={confettiEnabled}
          onChange={handleConfettiChange}
          label={"Confetti Enabled"}
        />
      )}
      <Box className={"custom-color-picker-and-heading-container"}>
        <h2>Background Color</h2>
        <CustomColorPicker
          value={bg.styles.backgroundColor}
          onChange={handleColorPickerChange}
        />
      </Box>

      <Stack gap={"1rem"}>
        <h2 className={styles["section-heading"]}>Background Image</h2>
        <Stack>
          <LocalOrUnsplashImagePicker
            value={bg.desktopbg}
            label={"Desktop"}
            forDevice={"desktop"}
            onImageSelected={handleDesktopBgImagePickerChange}
          />
          <LocalOrUnsplashImagePicker
            value={bg.mobilebg}
            label={"Mobile"}
            forDevice={"mobile"}
            onImageSelected={handleMobileBgImagePickerChange}
          />
        </Stack>
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
