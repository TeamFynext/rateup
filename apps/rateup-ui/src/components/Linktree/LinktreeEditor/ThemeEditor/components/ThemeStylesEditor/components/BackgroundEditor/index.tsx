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

  const handleBackgroundColorChange = useCallback((value: string) => {
    themeDispatch({
      type: "background-color-change",
      payload: value,
    });
  }, []);

  const handleDesktopBackgroundImageChange = useCallback((url: string) => {
    themeDispatch({
      type: "background-destktop-img-change",
      payload: url,
    });
  }, []);

  const handleMobileBackgroundImageChange = useCallback((url: string) => {
    themeDispatch({
      type: "background-mobile-img-change",
      payload: url,
    });
  }, []);

  return (
    <div className={styles["background-editor-div"]}>
      <div className={`style-section-div`}>
        <h2>Background Color</h2>
        <CustomColorPicker value={backgroundColor} onChange={handleBackgroundColorChange} />
      </div>

      <div className={`style-section-div`}>
        <h2>Background Image</h2>

        <div className={styles["bg-img-upload-btns-container"]}>
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
        </div>
      </div>
    </div>
  );
}

export default BackgroundEditor;
