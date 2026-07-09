import SaveChangesBtn from "./components/SaveChangesBtn/index.tsx";
import ThemePreview from "./components/ThemePreview/index.tsx";
import ThemeStyles from "./components/ThemeStylesEditor/index.tsx";
import { ThemeObjProvider } from "./ThemeContext/ThemeContext.tsx";

import styles from "./ThemeEditor.module.css";

function ThemeEditor() {
  return (
    <ThemeObjProvider>
      <div className={styles["theme-editor-root-div"]}>
        <div className={styles["save-changes-comp-container"]}>
          <SaveChangesBtn />
        </div>

        <div className={styles["theme-preview-and-styles-editors-wrapper"]}>
          <ThemePreview />
          <ThemeStyles />
        </div>
      </div>
    </ThemeObjProvider>
  );
}

export default ThemeEditor;
