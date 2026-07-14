import { IconEdit } from "@tabler/icons-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { useSelectedEditor, useSetSelectedEditor } from "../../ThemeContext/ThemeContext.tsx";
import BackgroundEditor from "./components/BackgroundEditor/index.tsx";
import LinklistItemEditor from "./components/LinklistItemEditor/index.tsx";
import LogoEditor from "./components/LogoEditor/index.tsx";
import SubtitleEditor from "./components/SubtitleEditor/index.tsx";
import TitleEditor from "./components/TitleEditor/index.tsx";
import { editorsList } from "./constants.tsx";

import styles from "./ThemeStylesEditor.module.css";

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
    <div className={styles["theme-styles-div"]}>
      <Select value={selectedEditor} items={editorsList} onValueChange={setSelectedEditor}>
        <SelectTrigger className={styles["editor-select-dropdown"]}>
          <IconEdit width={"1rem"} />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {editorsList.map((editor) => (
            <SelectItem key={editor.value} value={editor.value}>
              {editor.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Separator />
      <div className={styles["editor-container"]}>{componentToBeRendered}</div>
    </div>
  );
}

export default ThemeStyles;
