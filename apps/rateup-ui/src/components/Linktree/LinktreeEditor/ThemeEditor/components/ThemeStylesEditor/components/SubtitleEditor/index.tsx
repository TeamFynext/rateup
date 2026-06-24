import { Box, Slider } from "@mantine/core";
import { useCallback } from "react";

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

  const handleFontWeightChange = useCallback((value) => {
    themeDispatch({
      type: "subtitle-font-weight-change",
      payload: value,
    });
  }, []);

  const handleFontSizeChange = useCallback((value) => {
    themeDispatch({
      type: "subtitle-font-size-change",
      payload: value,
    });
  }, []);

  const handleColorChange = useCallback((value) => {
    themeDispatch({
      type: "subtitle-color-change",
      payload: value,
    });
  }, []);

  return (
    <Box className={styles["subtitle-editor-div"]}>
      <Box className={`style-section-div`}>
        <h2>Text Color</h2>
        <CustomColorPicker value={color} onChange={handleColorChange} />
      </Box>

      <Box className={`style-section-div`}>
        <h2>Font Weight</h2>
        <Slider
          value={fontWeight}
          onChange={handleFontWeightChange}
          label={(value) => value}
          step={100}
          defaultValue={500}
          min={100}
          max={900}
        />
      </Box>

      <Box className={`style-section-div`}>
        <h2>Font Size</h2>
        <Slider
          value={fontSize}
          onChange={handleFontSizeChange}
          label={(value) => value}
          step={1}
          defaultValue={30}
          min={10}
          max={50}
        />
      </Box>
    </Box>
  );
}

export default SubtitleEditor;
