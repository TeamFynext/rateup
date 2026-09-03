import { useCallback } from "react";

import type { SelectedImage } from "@/components/LocalOrUnsplashImagePicker/index.tsx";

import LocalOrUnsplashImagePicker from "../../../../../../../LocalOrUnsplashImagePicker/index.tsx";
import CustomColorPicker from "../../../../../../../Survey/ShareSurvey/components/CustomColorPicker/index.tsx";
import { useThemeDispatch, useThemeObj } from "../../../../ThemeContext/ThemeContext.tsx";

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

  const handleDesktopBackgroundImageChange = useCallback((url: SelectedImage) => {
    themeDispatch({
      type: "background-destktop-img-change",
      payload: url,
    });
  }, []);

  const handleMobileBackgroundImageChange = useCallback((url: SelectedImage) => {
    themeDispatch({
      type: "background-mobile-img-change",
      payload: url,
    });
  }, []);

  return (
    <div>
      <div className={`style-section-div`}>
        <h2>Background Color</h2>
        <CustomColorPicker
          value={String(backgroundColor ?? "")}
          onChange={handleBackgroundColorChange}
        />
      </div>

      <div className={`style-section-div`}>
        <h2>Background Image</h2>

        <div className={"flex flex-col gap-4"}>
          <LocalOrUnsplashImagePicker
            forDevice={"desktop"}
            label={"Desktop"}
            onImageSelected={handleDesktopBackgroundImageChange}
            value={desktopBgImgUrl ?? ""}
          />
          <LocalOrUnsplashImagePicker
            forDevice={"mobile"}
            label={"Mobile"}
            onImageSelected={handleMobileBackgroundImageChange}
            value={mobileBgImgUrl ?? ""}
          />
        </div>
      </div>
    </div>
  );
}

export default BackgroundEditor;
