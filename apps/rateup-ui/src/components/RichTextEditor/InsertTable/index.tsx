import { Popover } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { IconTable } from "@tabler/icons-react";
import { useCallback, useState } from "react";

import { useTiptopTableBtnHandlersObj } from "./HandlersObjHook.tsx";
import { tableActionsBtnsData } from "./TableActionBtnsList.tsx";
import TableActionButton from "./TableActionButton.tsx";

import styles from "./InsertTable.module.css";

function TiptapEditorInsertTable() {
  const [isPopoverOpened, setIsPopoverOpened] = useState(false);

  const actionHandlersObj = useTiptopTableBtnHandlersObj();

  const handleTableActionBtnClick = useCallback(
    (e) => {
      const action = e.currentTarget.value;
      const handler = actionHandlersObj[action];
      handler();
      setIsPopoverOpened(!isPopoverOpened);
    },
    [isPopoverOpened, actionHandlersObj],
  );

  return (
    <Popover
      opened={isPopoverOpened}
      width={"18.75rem"}
      position="bottom"
      withArrow
      shadow="md"
      onClose={() => {
        setIsPopoverOpened(false);
      }}
    >
      <Popover.Target>
        <RichTextEditor.Control
          onClick={() => setIsPopoverOpened(!isPopoverOpened)}
          aria-label="Insert Table"
          title="Insert Table"
        >
          <IconTable stroke={1.5} size="1rem" />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown className={styles["table-options-dropdown-div"]}>
        {tableActionsBtnsData.map(({ icon, label, value }) => {
          return (
            <TableActionButton
              key={value}
              label={label}
              icon={icon}
              value={value}
              onClick={handleTableActionBtnClick}
            />
          );
        })}
      </Popover.Dropdown>
    </Popover>
  );
}

export default TiptapEditorInsertTable;
