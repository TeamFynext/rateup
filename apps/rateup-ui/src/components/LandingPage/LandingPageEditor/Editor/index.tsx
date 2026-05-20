import { Stack } from "@mantine/core";

import styles from "./Editor.module.css";
import RichTextEditor from "./RichTextEditor/index.tsx";

function Editor() {
  return (
    <Stack className={styles["editor-root"]}>
      <RichTextEditor />
    </Stack>
  );
}

export default Editor;
