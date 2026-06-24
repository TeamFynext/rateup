import { Stack } from "@mantine/core";

import RichTextEditor from "./RichTextEditor/index.tsx";

import styles from "./Editor.module.css";

function Editor() {
  return (
    <Stack className={styles["editor-root"]}>
      <RichTextEditor />
    </Stack>
  );
}

export default Editor;
