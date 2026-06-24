import { Box } from "@mantine/core";

import SaveChangesBtn from "./components/SaveChangesBtn/index.tsx";
import ThemePreview from "./components/ThemePreview/index.tsx";
import ThemeStyles from "./components/ThemeStylesEditor/index.tsx";
import { ThemeObjProvider } from "./ThemeContext/ThemeContext.tsx";

import styles from "./ThemeEditor.module.css";

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
