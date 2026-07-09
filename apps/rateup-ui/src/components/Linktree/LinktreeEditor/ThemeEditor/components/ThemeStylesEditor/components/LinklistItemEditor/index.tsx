import { useCallback } from "react";

import { Slider } from "@/components/ui/slider";

import CustomColorPicker from "../../../../../../../Survey/ShareSurvey/components/CustomColorPicker/index.tsx";
import { useThemeDispatch, useThemeObj } from "../../../../ThemeContext/ThemeContext.tsx";

import styles from "./LinklistItemEditor.module.css";

function LinklistItemEditor() {
  const {
    linkListItem: {
      styles: { color, backgroundColor, borderRadius },
    },
  } = useThemeObj();
  const themeDispatch = useThemeDispatch();

  const handleColorChange = useCallback((value) => {
    themeDispatch({
      type: "linkListItem-color-change",
      payload: value,
    });
  }, []);

  const handleBackgroundColorChange = useCallback((value) => {
    themeDispatch({
      type: "linkListItem-background-color-change",
      payload: value,
    });
  }, []);

  const handleBorderRadiusChange = useCallback((value) => {
    themeDispatch({
      type: "linkListItem-border-radius-change",
      payload: value,
    });
  }, []);

  return (
    <div className={styles["link-list-editor"]}>
      <div className={`style-section-div`}>
        <h2>Text Color</h2>
        <CustomColorPicker value={color} onChange={handleColorChange} />
      </div>

      <div className={`style-section-div`}>
        <h2>Background Color</h2>
        <CustomColorPicker value={backgroundColor} onChange={handleBackgroundColorChange} />
      </div>

      <div className={`style-section-div`}>
        <h2>Border Radius</h2>
        <Slider
          value={[borderRadius]}
          onValueChange={(value) =>
            handleBorderRadiusChange(Array.isArray(value) ? value[0] : value)
          }
          step={1}
          min={0}
          max={100}
        />
      </div>
    </div>
  );
}

export default LinklistItemEditor;
