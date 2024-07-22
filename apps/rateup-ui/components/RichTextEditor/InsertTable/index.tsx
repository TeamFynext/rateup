import { Button, Popover, Text } from "@mantine/core";
import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";
import { IconTable } from "@tabler/icons-react";

import styles from "./InsertTable.module.css";

function TiptapEditorInsertTable() {
  const { editor } = useRichTextEditorContext();
  console.log(editor, "From Tiptap editor insert table");
  return (
    <Popover width={400} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <RichTextEditor.Control
          onClick={() => editor?.commands.insertContent("⭐")}
          aria-label="Insert star emoji"
          title="Insert Table"
        >
          <IconTable stroke={1.5} size="1rem" />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown className={styles["table-options-dropdown-div"]}>
        <Button
          variant="light"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          Insert table
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          Delete table
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().addColumnBefore().run()}
        >
          Add column before
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          Add column after
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          Delete column
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().addRowBefore().run()}
        >
          Add row before
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          Add row after
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          Delete row
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().mergeCells().run()}
        >
          Merge cells
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().splitCell().run()}
        >
          Split cell
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
        >
          Toggle header column
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        >
          Toggle header row
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().toggleHeaderCell().run()}
        >
          Toggle header cell
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().mergeOrSplit().run()}
        >
          Merge or split
        </Button>
        <Button
          variant={"light"}
          onClick={() =>
            editor.chain().focus().setCellAttribute("colspan", 2).run()
          }
        >
          Set cell attribute
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().fixTables().run()}
        >
          Fix tables
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().goToNextCell().run()}
        >
          Go to next cell
        </Button>
        <Button
          variant={"light"}
          onClick={() => editor.chain().focus().goToPreviousCell().run()}
        >
          Go to previous cell
        </Button>
      </Popover.Dropdown>
    </Popover>
  );
}

export default TiptapEditorInsertTable;
