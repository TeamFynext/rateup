import { Box } from "@mantine/core";
import styles from "./LinklistItemEditor.module.css";
import CustomColorPicker from "../../../../../../../Survey/ShareSurvey/components/CustomColorPicker";
import { useCallback } from "react";
import {
  useThemeDispatch,
  useThemeObj,
} from "../../../../ThemeContext/ThemeContext";

function LinklistItemEditor() {
  const {
    linkListItem: {
      styles: { color, backgroundColor },
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
    </Box>
  );
}

export default LinklistItemEditor;
