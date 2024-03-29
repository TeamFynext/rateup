import { Box, Button } from "@mantine/core";
import ThemePreview from "./components/ThemePreview";
import styles from "./ThemeEditor.module.css";
import ThemeStyles from "./components/ThemeStylesEditor";
import { ThemeObjProvider } from "./ThemeContext/ThemeContext";
import SaveChangesBtn from "./components/SaveChangesBtn";

function ThemeEditor() {
  return (
    <ThemeObjProvider>
      <Box className={styles["theme-editor-root-div"]}>
        <Box className={styles["save-changes-comp-container"]}>
          <SaveChangesBtn />
        </Box>

        <Box className={styles["theme-preview-and-styles-editors-wrapper"]}>
          <ThemePreview />
          <ThemeStyles />
        </Box>
      </Box>
    </ThemeObjProvider>
  );
}

export default ThemeEditor;
