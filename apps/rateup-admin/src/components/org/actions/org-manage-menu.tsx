import {
  IconAdjustmentsHorizontal,
  IconBan,
  IconCalendarEvent,
  IconChevronDown,
  IconLockOpen,
  IconNote,
  IconPackage,
  IconSwitchHorizontal,
} from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { OrgAction } from "./org-action-dialogs";

/** The org header's quick actions. Each opens its dialog; nothing happens from the menu itself. */
export function OrgManageMenu({
  onAction,
  suspended,
  onPrefetch,
}: {
  onAction: (action: OrgAction) => void;
  suspended: boolean;
  /** Warms what the dialogs read, so they open filled rather than on a skeleton. */
  onPrefetch?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onPointerEnter={onPrefetch}
        onFocus={onPrefetch}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        Manage
        <IconChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-auto min-w-56 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Subscription</DropdownMenuLabel>
          <DropdownMenuItem className="py-2" onClick={() => onAction({ kind: "plan" })}>
            <IconSwitchHorizontal />
            Change plan
          </DropdownMenuItem>
          <DropdownMenuItem className="py-2" onClick={() => onAction({ kind: "expiry" })}>
            <IconCalendarEvent />
            Change expiry
          </DropdownMenuItem>
          <DropdownMenuItem className="py-2" onClick={() => onAction({ kind: "limits" })}>
            <IconAdjustmentsHorizontal />
            Edit limits
          </DropdownMenuItem>
          <DropdownMenuItem className="py-2" onClick={() => onAction({ kind: "grant-packs" })}>
            <IconPackage />
            Grant conversation packs
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuItem className="py-2" onClick={() => onAction({ kind: "note" })}>
            <IconNote />
            Add a note
          </DropdownMenuItem>
          {suspended ? (
            <DropdownMenuItem className="py-2" onClick={() => onAction({ kind: "unsuspend" })}>
              <IconLockOpen />
              Restore access
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="py-2 text-negative data-highlighted:text-negative"
              onClick={() => onAction({ kind: "suspend" })}
            >
              <IconBan />
              Suspend
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
