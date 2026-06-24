import { Box } from "@mantine/core";
import { useCallback } from "react";

import LocalOrUnsplashImagePicker from "../../../../../../../LocalOrUnsplashImagePicker/index.tsx";
import CustomColorPicker from "../../../../../../../Survey/ShareSurvey/components/CustomColorPicker/index.tsx";
import { useThemeDispatch, useThemeObj } from "../../../../ThemeContext/ThemeContext.tsx";

import styles from "./BackgroundEditor.module.css";

function BackgroundEditor() {
  const {
    background: {
      styles: { backgroundColor },
      desktopBgImgUrl,
      mobileBgImgUrl,
    },
  } = useThemeObj();
  const themeDispatch = useThemeDispatch();

  const handleBackgroundColorChange = useCallback((value) => {
    themeDispatch({
      type: "background-color-change",
      payload: value,
    });
  }, []);

  const handleDesktopBackgroundImageChange = useCallback((url) => {
    themeDispatch({
      type: "background-destktop-img-change",
      payload: url,
    });
  }, []);

  const handleMobileBackgroundImageChange = useCallback((url) => {
    themeDispatch({
      type: "background-mobile-img-change",
      payload: url,
    });
  }, []);

  return (
    <Box className={styles["background-editor-div"]}>
      <Box className={`style-section-div`}>
        <h2>Background Color</h2>
        <CustomColorPicker value={backgroundColor} onChange={handleBackgroundColorChange} />
      </Box>

      <Box className={`style-section-div`}>
        <h2>Background Image</h2>

        <Box className={styles["bg-img-upload-btns-container"]}>
          <LocalOrUnsplashImagePicker
            forDevice={"desktop"}
            label={"Desktop"}
            onImageSelected={handleDesktopBackgroundImageChange}
            value={desktopBgImgUrl}
          />
          <LocalOrUnsplashImagePicker
            forDevice={"mobile"}
            label={"Mobile"}
            onImageSelected={handleMobileBackgroundImageChange}
            value={mobileBgImgUrl}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default BackgroundEditor;
