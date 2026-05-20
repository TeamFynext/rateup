"use client";

import { Box, Divider, Select } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";

import {
  useSelectedEditor,
  useSetSelectedEditor,
} from "../../ThemeContext/ThemeContext.tsx";
import BackgroundEditor from "./components/BackgroundEditor/index.tsx";
import LinklistItemEditor from "./components/LinklistItemEditor/index.tsx";
import LogoEditor from "./components/LogoEditor/index.tsx";
import SubtitleEditor from "./components/SubtitleEditor/index.tsx";
import TitleEditor from "./components/TitleEditor/index.tsx";
import { editorsList } from "./constants.tsx";
import styles from "./ThemeStylesEditor.module.css";

function RenderOption({ option, checked }) {
  return <Box>{option.label}</Box>;
}

function ThemeStyles() {
  const selectedEditor = useSelectedEditor();
  const setSelectedEditor = useSetSelectedEditor();

  let componentToBeRendered = null;
  switch (selectedEditor) {
    case "background": {
      componentToBeRendered = <BackgroundEditor />;
      break;
    }
    case "logo": {
      componentToBeRendered = <LogoEditor />;
      break;
    }
    case "title": {
      componentToBeRendered = <TitleEditor />;
      break;
    }
    case "subtitle": {
      componentToBeRendered = <SubtitleEditor />;
      break;
    }
    case "link-item": {
      componentToBeRendered = <LinklistItemEditor />;
      break;
    }
  }

  return (
    <Box className={styles["theme-styles-div"]}>
      <Select
        className={styles["editor-select-dropdown"]}
        value={selectedEditor}
        data={editorsList}
        onChange={setSelectedEditor}
        leftSection={<IconEdit width={"1rem"} />}
        renderOption={RenderOption}
        classNames={{
          option: styles["editor-select-dropdown-option"],
          input: styles["editor-selector-dropdown-input"],
        }}
        allowDeselect={false}
      />
      <Divider />
      <Box className={styles["editor-container"]}>{componentToBeRendered}</Box>
    </Box>
  );
}

export default ThemeStyles;
