"use client";

import {
  ArrowLeft,
  ArrowUp,
  CheckCheck,
  FileText,
  Loader2,
  Redo2,
  Save,
  Settings,
  Table,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

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
  refetch?: () => void;
  isPending?: boolean;
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
  refetch,
  isPending = false,
}: Readonly<ToolbarProps>) {
  return (
    <div className={styles.toolbar}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={styles.toolbarButton}
            onClick={onSave}
            disabled={saveDisabled}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Save</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={styles.toolbarButton}
            onClick={() => validateFlow(false)}
          >
            <CheckCheck className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Validate</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={styles.toolbarButton}
              >
                <Table className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Layout</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onAutoLayout("TB")}>
            <ArrowUp className="mr-2 h-4 w-4" />
            Vertical Layout
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAutoLayout("LR")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Horizontal Layout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={styles.toolbarButton}
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={styles.toolbarButton}
            onClick={onRedo}
            disabled={!canRedo}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo (Ctrl+Y or Ctrl+Shift+Z)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={styles.toolbarButton}
            onClick={() => {
              refetch?.();
              handleTabSwitch("settings");
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>

      {/* <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={styles.toolbarButton}
              onClick={() => handleTabSwitch("share")}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share</TooltipContent>
        </Tooltip> */}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={styles.toolbarButton}
            onClick={() => handleTabSwitch("response")}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Response</TooltipContent>
      </Tooltip>
    </div>
  );
}
