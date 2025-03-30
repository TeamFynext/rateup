"use client";

import { Button, Menu } from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowLeft,
  IconArrowUp,
  IconChecklist,
  IconChevronDown,
  IconDeviceFloppy,
  IconDownload,
  IconFileExport,
  IconTable,
} from "@tabler/icons-react";

import styles from "./toolbar.module.css";

interface ToolbarProps {
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
  onAutoLayout: (direction: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function Toolbar({
  onSave,
  onLoad,
  onExport,
  onAutoLayout,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <Button
        variant="outline"
        className={styles.toolbarButton}
        leftSection={<IconDeviceFloppy size={16} />}
        onClick={onSave}
      >
        Save
      </Button>

      {/* <Button
        variant="outline"
        className={styles.toolbarButton}
        leftSection={<IconDownload size={16} />}
        onClick={onLoad}
      >
        Load
      </Button>

      <Button
        variant="outline"
        className={styles.toolbarButton}
        leftSection={<IconFileExport size={16} />}
        onClick={onExport}
      >
        Export
      </Button> */}

      <Menu position="bottom-start">
        <Menu.Target>
          <Button
            variant="outline"
            className={styles.toolbarButton}
            leftSection={<IconTable size={16} />}
            rightSection={<IconChevronDown size={12} />}
          >
            Layout
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconArrowUp size={16} />}
            onClick={() => onAutoLayout("TB")}
          >
            Vertical Layout
          </Menu.Item>
          <Menu.Item
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => onAutoLayout("LR")}
          >
            Horizontal Layout
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Button
        variant="outline"
        className={styles.toolbarButton}
        leftSection={<IconArrowBackUp size={16} />}
        onClick={onUndo}
        disabled={!canUndo}
      >
        Undo
      </Button>

      <Button
        variant="outline"
        className={styles.toolbarButton}
        leftSection={<IconArrowForwardUp size={16} />}
        onClick={onRedo}
        disabled={!canRedo}
      >
        Redo
      </Button>
    </div>
  );
}
