import { useRichTextEditorContext } from "@mantine/tiptap";

const useTiptopTableBtnHandlersObj = () => {
  const { editor } = useRichTextEditorContext();

  return {
    insertTable: () => {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
    deleteTable: () => {
      editor.chain().focus().deleteTable().run();
    },
    addColumnBefore: () => {
      editor.chain().focus().addColumnBefore().run();
    },
    addColumnAfter: () => {
      editor.chain().focus().addColumnAfter().run();
    },
    deleteColumn: () => {
      editor.chain().focus().deleteColumn().run();
    },
    addRowBefore: () => {
      editor.chain().focus().addRowBefore().run();
    },
    addRowAfter: () => {
      editor.chain().focus().addRowAfter().run();
    },
    deleteRow: () => {
      editor.chain().focus().deleteRow().run();
    },
    mergeCells: () => {
      editor.chain().focus().mergeCells().run();
    },
    splitCell: () => {
      editor.chain().focus().splitCell().run();
    },
    toggleHeaderColumn: () => {
      editor.chain().focus().toggleHeaderColumn().run();
    },
    toggleHeaderRow: () => {
      editor.chain().focus().toggleHeaderRow().run();
    },
    toggleHeaderCell: () => {
      editor.chain().focus().toggleHeaderCell().run();
    },
    mergeOrSplit: () => {
      editor.chain().focus().mergeOrSplit().run();
    },
    setCellAttribute: () => {
      editor.chain().focus().setCellAttribute("colspan", 2).run();
    },
    fixTables: () => {
      editor.chain().focus().fixTables().run();
    },
    goToNextCell: () => {
      editor.chain().focus().goToNextCell().run();
    },
    goToPreviousCell: () => {
      editor.chain().focus().goToPreviousCell().run();
    },
  };
};

export { useTiptopTableBtnHandlersObj };
