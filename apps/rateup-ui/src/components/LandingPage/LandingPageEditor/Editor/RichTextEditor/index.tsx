import { Group } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";

import InsertEmoji from "@/components/RichTextEditor/InsertEmoji/index.tsx";
import InsertImage from "@/components/RichTextEditor/InsertImage/index.tsx";
import InsertTable from "@/components/RichTextEditor/InsertTable/index.tsx";
import InsertVideo from "@/components/RichTextEditor/InsertVideo/index.tsx";

import { useTiptapEditorInstance } from "../../LandingPageContext/LandingPageContext.tsx";
import SaveButton from "../SaveButton/index.tsx";

import styles from "./RichTextEditor.module.css";

function RichTextEditorComp() {
  const editorInstance = useTiptapEditorInstance();

  if (editorInstance) {
    return (
      <RichTextEditor editor={editorInstance} className={styles["root-div"]}>
        <RichTextEditor.Toolbar className={styles["toolbar-div"]} sticky tabIndex={-1}>
          <Group gap={"xs"}>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.ColorPicker
                colors={[
                  "#25262b",
                  "#868e96",
                  "#fa5252",
                  "#e64980",
                  "#be4bdb",
                  "#7950f2",
                  "#4c6ef5",
                  "#228be6",
                  "#15aabf",
                  "#12b886",
                  "#40c057",
                  "#82c91e",
                  "#fab005",
                  "#fd7e14",
                ]}
              />
              <RichTextEditor.UnsetColor />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.Underline />
              <RichTextEditor.Strikethrough />
              <RichTextEditor.ClearFormatting />
              <RichTextEditor.Code />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.H1 />
              <RichTextEditor.H2 />
              <RichTextEditor.H3 />
              <RichTextEditor.H4 />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Blockquote />
              <RichTextEditor.Hr />
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Link popoverProps={{ withinPortal: false }} />
              <RichTextEditor.Unlink />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.AlignLeft />
              <RichTextEditor.AlignCenter />
              <RichTextEditor.AlignJustify />
              <RichTextEditor.AlignRight />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Undo />
              <RichTextEditor.Redo />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <InsertEmoji />
              <InsertImage />
              <InsertVideo />
              <InsertTable />
            </RichTextEditor.ControlsGroup>
          </Group>

          <SaveButton />
        </RichTextEditor.Toolbar>

        <RichTextEditor.Content className={styles["editor-content"]} />
      </RichTextEditor>
    );
  } else {
    return null;
  }
}

export default RichTextEditorComp;
