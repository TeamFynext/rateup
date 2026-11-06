import {
  IconArrowBackUp,
  IconArrowDown,
  IconArrowForwardUp,
  IconArrowRight,
  IconChecks,
  IconDeviceFloppy,
  IconLoader2,
  IconSettings,
  IconSparkles,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

interface ToolbarProps {
  onSave: () => void;
  onAutoLayout: (direction: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenSettings?: () => void;
  validateFlow: (slient?: boolean) => void;
  saveDisabled?: boolean;
  refetch?: () => void;
  isPending?: boolean;
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = "ghost",
}: Readonly<{
  icon: ComponentType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "ghost" | "default";
}>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            type="button"
            variant={variant}
            size="icon-sm"
            onClick={onClick}
            disabled={disabled}
          />
        }
      >
        <Icon />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Divider() {
  return <Separator orientation="vertical" className="mx-0.5 h-5" />;
}

export default function Toolbar({
  onSave,
  onAutoLayout,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenSettings,
  validateFlow,
  saveDisabled = false,
  refetch,
  isPending = false,
}: Readonly<ToolbarProps>) {
  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-1 shadow-lg">
      {/* Save */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="Save"
              type="button"
              variant={saveDisabled ? "ghost" : "default"}
              size="icon-sm"
              onClick={onSave}
              disabled={saveDisabled || isPending}
            />
          }
        >
          {isPending ? <IconLoader2 className="animate-spin" /> : <IconDeviceFloppy />}
        </TooltipTrigger>
        <TooltipContent>{saveDisabled ? "All changes saved" : "Save"}</TooltipContent>
      </Tooltip>

      <ToolButton icon={IconChecks} label="Validate flow" onClick={() => validateFlow(false)} />

      <Divider />

      <ToolButton
        icon={IconArrowBackUp}
        label="Undo (Ctrl+Z)"
        onClick={onUndo}
        disabled={!canUndo}
      />
      <ToolButton
        icon={IconArrowForwardUp}
        label="Redo (Ctrl+Y)"
        onClick={onRedo}
        disabled={!canRedo}
      />

      <Divider />

      {/* Auto layout */}
      <DropdownMenu>
        <Tooltip>
          <DropdownMenuTrigger
            render={
              <TooltipTrigger
                render={
                  <Button
                    aria-label="Generate with AI"
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                  />
                }
              />
            }
          >
            <IconSparkles />
          </DropdownMenuTrigger>
          <TooltipContent>Auto layout</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => onAutoLayout("TB")}>
            <IconArrowDown className="mr-2 h-4 w-4" />
            Vertical
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAutoLayout("LR")}>
            <IconArrowRight className="mr-2 h-4 w-4" />
            Horizontal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Divider />

      <ToolButton
        icon={IconSettings}
        label="Settings"
        onClick={() => {
          refetch?.();
          onOpenSettings?.();
        }}
      />
    </div>
  );
}
