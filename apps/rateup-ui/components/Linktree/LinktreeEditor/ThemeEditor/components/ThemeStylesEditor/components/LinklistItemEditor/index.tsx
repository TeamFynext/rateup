"use client";

import { useCallback } from "react";

import { Box, Slider } from "@mantine/core";

import CustomColorPicker from "../../../../../../../Survey/ShareSurvey/components/CustomColorPicker";
import {
  useThemeDispatch,
  useThemeObj,
} from "../../../../ThemeContext/ThemeContext";
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
    <Box className={styles["link-list-editor"]}>
      <Box className={`style-section-div`}>
        <h2>Text Color</h2>
        <CustomColorPicker value={color} onChange={handleColorChange} />
      </Box>

      <Box className={`style-section-div`}>
        <h2>Background Color</h2>
        <CustomColorPicker
          value={backgroundColor}
          onChange={handleBackgroundColorChange}
        />
      </Box>

      <Box className={`style-section-div`}>
        <h2>Border Radius</h2>
        <Slider
          value={borderRadius}
          onChange={handleBorderRadiusChange}
          label={(value) => value}
          step={1}
          defaultValue={16}
          min={0}
          max={100}
        />
      </Box>
    </Box>
  );
}

export default LinklistItemEditor;
