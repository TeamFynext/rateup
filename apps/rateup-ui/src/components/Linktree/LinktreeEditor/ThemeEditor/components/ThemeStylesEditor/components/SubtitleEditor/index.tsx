import { useCallback } from "react";

import { Slider } from "@/components/ui/slider";

import CustomColorPicker from "../../../../../../../Survey/ShareSurvey/components/CustomColorPicker/index.tsx";
import { useThemeDispatch, useThemeObj } from "../../../../ThemeContext/ThemeContext.tsx";

import styles from "./SubtitleEditor.module.css";

function SubtitleEditor() {
  const {
    subtitle: {
      styles: { fontWeight, fontSize, color },
    },
  } = useThemeObj();
  const themeDispatch = useThemeDispatch();

  const handleFontWeightChange = useCallback((value: string | number) => {
    themeDispatch({
      type: "subtitle-font-weight-change",
      payload: value,
    });
  }, []);

  const handleFontSizeChange = useCallback((value: string | number) => {
    themeDispatch({
      type: "subtitle-font-size-change",
      payload: value,
    });
  }, []);

  const handleColorChange = useCallback((value: string | number) => {
    themeDispatch({
      type: "subtitle-color-change",
      payload: value,
    });
  }, []);

  return (
    <div className={styles["subtitle-editor-div"]}>
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
          min={10}
          max={50}
        />
      </div>
    </div>
  );
}

export default SubtitleEditor;
