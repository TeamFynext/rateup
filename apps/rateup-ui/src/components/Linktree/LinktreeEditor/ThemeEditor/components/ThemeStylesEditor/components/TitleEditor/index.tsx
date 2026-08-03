import { useCallback } from "react";

import { Slider } from "@/components/ui/slider";

import CustomColorPicker from "../../../../../../../Survey/ShareSurvey/components/CustomColorPicker/index.tsx";
import { useThemeDispatch, useThemeObj } from "../../../../ThemeContext/ThemeContext.tsx";

import styles from "./TitleEditor.module.css";

function TitleEditor() {
  const {
    title: {
      styles: { fontWeight, fontSize, color },
    },
  } = useThemeObj();
  const themeDispatch = useThemeDispatch();

  const handleFontWeightChange = useCallback((value: string | number) => {
    themeDispatch({
      type: "title-font-weight-change",
      payload: value,
    });
  }, []);

  const handleFontSizeChange = useCallback((value: string | number) => {
    themeDispatch({
      type: "title-font-size-change",
      payload: value,
    });
  }, []);

  const handleColorChange = useCallback((value: string | number) => {
    themeDispatch({
      type: "title-color-change",
      payload: value,
    });
  }, []);

  return (
    <div className={styles["title-editor-div"]}>
      <div className={`style-section-div`}>
        <h2>Text Color</h2>
        <CustomColorPicker value={String(color ?? "")} onChange={handleColorChange} />
      </div>

      <div className={`style-section-div`}>
        <h2>Font Weight</h2>
        <Slider
          value={[Number(fontWeight ?? 0)]}
          onValueChange={(value) => handleFontWeightChange(Array.isArray(value) ? value[0] : value)}
          step={100}
          min={100}
          max={900}
        />
      </div>

      <div className={`style-section-div`}>
        <h2>Font Size</h2>
        <Slider
          value={[Number(fontSize ?? 0)]}
          onValueChange={(value) => handleFontSizeChange(Array.isArray(value) ? value[0] : value)}
          step={1}
          min={16}
          max={100}
        />
      </div>
    </div>
  );
}

export default TitleEditor;
