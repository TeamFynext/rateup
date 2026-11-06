import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils.ts";

function PanelIconButton({
  label,
  onClick,
  children,
}: Readonly<{ label: string; onClick: () => void; children: ReactNode }>) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

/**
 * Shared side panel used by the component palette and the node editor so both
 * look consistent. `collapsible` panels can shrink to a slim strip; others just
 * show a close button.
 */
export function FlowPanel({
  side,
  title,
  icon,
  onClose,
  footer,
  children,
  collapsible = false,
  defaultCollapsed = false,
}: Readonly<{
  side: "left" | "right";
  title: ReactNode;
  icon?: ReactNode;
  onClose?: () => void;
  footer?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}>) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const borderSide = side === "left" ? "border-r" : "border-l";

  // Chevron points "outward" to collapse, "inward" to expand.
  const collapseToward = side === "left" ? IconChevronLeft : IconChevronRight;
  const expandToward = side === "left" ? IconChevronRight : IconChevronLeft;
  const ToggleIcon = collapsed ? expandToward : collapseToward;

  if (collapsible && collapsed) {
    return (
      <div
        className={cn(
          "flex w-11 shrink-0 flex-col items-center gap-3 border-border bg-ru-n-25 dark:bg-card",
          borderSide,
        )}
      >
        {/* Same h-14 band as the expanded header, so the toggle stays put when
            the panel collapses instead of jumping up. */}
        <div className="flex h-14 shrink-0 items-center">
          <PanelIconButton label="Expand panel" onClick={() => setCollapsed(false)}>
            <ToggleIcon size={18} />
          </PanelIconButton>
        </div>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col border-border bg-ru-n-25 dark:bg-card",
        borderSide,
      )}
    >
      {/* h-14 is the shared panel-header height (sidebar, phone preview, inbox
          panels), and the divider lives on the h-14 box itself so its line lands
          on the same y as theirs — the phone preview panel sits right next to it. */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        {icon}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
        {collapsible && (
          <PanelIconButton label="Collapse panel" onClick={() => setCollapsed(true)}>
            <ToggleIcon size={18} />
          </PanelIconButton>
        )}
        {onClose && (
          <PanelIconButton label="Close panel" onClick={onClose}>
            <IconX size={18} />
          </PanelIconButton>
        )}
      </header>
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
      {footer && <div className="border-t border-border p-3">{footer}</div>}
    </div>
  );
}
