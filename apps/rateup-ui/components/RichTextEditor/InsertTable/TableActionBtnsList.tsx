import {
  IconAffiliate,
  IconArrowMerge,
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconArrowsSplit,
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconColumnRemove,
  IconGitMerge,
  IconLayoutNavbar,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconRowRemove,
  IconSeparatorVertical,
  IconTableColumn,
  IconTableMinus,
  IconTablePlus,
  IconTableRow,
} from "@tabler/icons-react";

const tableActionsBtnsData = [
  {
    value: "insertTable",
    label: "Insert table",
    icon: <IconTablePlus />,
  },
  {
    value: "deleteTable",
    label: "Delete table",
    icon: <IconTableMinus />,
  },
  {
    value: "addColumnBefore",
    label: "Add column before",
    icon: <IconColumnInsertLeft />,
  },
  {
    value: "addColumnAfter",
    label: "Add column after",
    icon: <IconColumnInsertRight />,
  },
  {
    value: "deleteColumn",
    label: "Delete column",
    icon: <IconColumnRemove />,
  },
  {
    value: "addRowBefore",
    label: "Add row before",
    icon: <IconRowInsertTop />,
  },
  {
    value: "addRowAfter",
    label: "Add row after",
    icon: <IconRowInsertBottom />,
  },
  {
    value: "deleteRow",
    label: "Delete row",
    icon: <IconRowRemove />,
  },
  {
    value: "mergeCells",
    label: "Merge cells",
    icon: <IconArrowMerge />,
  },
  {
    value: "splitCell",
    label: "Split cell",
    icon: <IconArrowsSplit />,
  },
  {
    value: "toggleHeaderColumn",
    label: "Toggle header column",
    icon: <IconTableColumn />,
  },
  {
    value: "toggleHeaderRow",
    label: "Toggle header row",
    icon: <IconTableRow />,
  },
  {
    value: "toggleHeaderCell",
    label: "Toggle header cell",
    icon: <IconLayoutNavbar />,
  },
  {
    value: "mergeOrSplit",
    label: "Merge or split Cell",
    icon: <IconGitMerge />,
  },
  {
    value: "setCellAttribute",
    label: "Set Column Span to 2",
    icon: <IconSeparatorVertical />,
  },
  {
    value: "fixTables",
    label: "Fix tables",
    icon: <IconAffiliate />,
  },
  {
    value: "goToNextCell",
    label: "Go to next cell",
    icon: <IconArrowNarrowRight />,
  },
  {
    value: "goToPreviousCell",
    label: "Go to previous cell",
    icon: <IconArrowNarrowLeft />,
  },
];

export { tableActionsBtnsData };
