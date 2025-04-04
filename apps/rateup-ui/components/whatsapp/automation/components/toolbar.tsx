"use client";

import { ActionIcon, Menu, Tooltip } from "@mantine/core";
import {
  IconAdjustmentsPlus,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowLeft,
  IconArrowUp,
  IconChevronDown,
  IconCopyCheck,
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
  validateFlow: (slient?: boolean) => void;
  saveDisabled?: boolean;
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
  validateFlow,
  saveDisabled = false,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <Tooltip label="Save">
        <ActionIcon
          variant="outline"
          className={styles.toolbarButton}
          onClick={onSave}
          disabled={saveDisabled}
          size={"lg"}
        >
          <IconDeviceFloppy />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="Validate">
        <ActionIcon
          variant="outline"
          className={styles.toolbarButton}
          onClick={() => validateFlow(false)}
          size={"lg"}
        >
          <IconCopyCheck />
        </ActionIcon>
      </Tooltip>

      <Menu position="bottom-start">
        <Menu.Target>
          <Tooltip label="Layout">
            <ActionIcon
              variant="outline"
              className={styles.toolbarButton}
              size={"lg"}
            >
              <IconTable />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconArrowUp />}
            onClick={() => onAutoLayout("TB")}
          >
            Vertical Layout
          </Menu.Item>
          <Menu.Item
            leftSection={<IconArrowLeft />}
            onClick={() => onAutoLayout("LR")}
          >
            Horizontal Layout
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Tooltip label="Undo (Ctrl+Z)">
        <ActionIcon
          variant="outline"
          className={styles.toolbarButton}
          onClick={onUndo}
          disabled={!canUndo}
          size={"lg"}
        >
          <IconArrowBackUp />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="Redo (Ctrl+Y or Ctrl+Shift+Z)">
        <ActionIcon
          variant="outline"
          className={styles.toolbarButton}
          onClick={onRedo}
          disabled={!canRedo}
          size={"lg"}
        >
          <IconArrowForwardUp />
        </ActionIcon>
      </Tooltip>

      <Menu position="bottom-start">
        <Menu.Target>
          <Tooltip label="More">
            <ActionIcon
              variant="outline"
              className={styles.toolbarButton}
              size={"lg"}
            >
              <IconAdjustmentsPlus />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconSettings />}
            onClick={() => handleTabSwitch("settings")}
          >
            Settings
          </Menu.Item>
          <Menu.Item
            leftSection={<IconShare />}
            onClick={() => handleTabSwitch("share")}
          >
            Share
          </Menu.Item>
          <Menu.Item
            leftSection={<IconReport />}
            onClick={() => handleTabSwitch("response")}
          >
            Response
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}
