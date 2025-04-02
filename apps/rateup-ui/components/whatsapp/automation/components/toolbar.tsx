"use client";

import { Button, Menu } from "@mantine/core";
import {
  IconAdjustmentsPlus,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowLeft,
  IconArrowUp,
  IconChevronDown,
  IconDeviceFloppy,
  IconReport,
  IconSettings,
  IconShare,
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
  handleTabSwitch: (tab: string) => void;
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
  handleTabSwitch,
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

      <Menu position="bottom-start">
        <Menu.Target>
          <Button
            variant="outline"
            className={styles.toolbarButton}
            leftSection={<IconAdjustmentsPlus size={16} />}
            rightSection={<IconChevronDown size={12} />}
          >
            More
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconSettings size={16} />}
            onClick={() => handleTabSwitch("settings")}
          >
            Settings
          </Menu.Item>
          <Menu.Item
            leftSection={<IconShare size={16} />}
            onClick={() => handleTabSwitch("share")}
          >
            Share
          </Menu.Item>
          <Menu.Item
            leftSection={<IconReport size={16} />}
            onClick={() => handleTabSwitch("response")}
          >
            Response
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}
