import {
  IconAdjustmentsHorizontal,
  IconBan,
  IconCalendarEvent,
  IconDots,
  IconLockOpen,
  IconNote,
  IconPackage,
  IconSwitchHorizontal,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
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

/** The org header's actions: the three used most as buttons, the rest behind "More". */
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
    <div
      className="flex flex-wrap items-center gap-2"
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
    >
      <Button onClick={() => onAction({ kind: "plan" })}>
        <IconSwitchHorizontal />
        Change plan
      </Button>
      <Button variant="outline" onClick={() => onAction({ kind: "grant-packs" })}>
        <IconPackage />
        Grant packs
      </Button>
      <Button variant="outline" onClick={() => onAction({ kind: "note" })}>
        <IconNote />
        Add note
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon" aria-label="More actions">
              <IconDots />
            </Button>
          }
        />
        <DropdownMenuContent align="end" sideOffset={6} className="w-auto min-w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Subscription</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAction({ kind: "expiry" })}>
              <IconCalendarEvent />
              Change expiry
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction({ kind: "limits" })}>
              <IconAdjustmentsHorizontal />
              Edit limits
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            {suspended ? (
              <DropdownMenuItem onClick={() => onAction({ kind: "unsuspend" })}>
                <IconLockOpen />
                Restore access
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onClick={() => onAction({ kind: "suspend" })}>
                <IconBan />
                Suspend
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
