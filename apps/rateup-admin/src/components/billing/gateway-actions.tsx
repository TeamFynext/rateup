import { IconDotsVertical, IconRefresh } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  DeleteGatewayDialog,
  GatewayStatusDialog,
  SyncDialog,
  type GatewayRowRef,
} from "./catalog-dialogs";

type Gateway = "razorpay" | "stripe";

/** The page header's Sync button, with its dialog. */
export function SyncButton({ gateway }: { gateway: Gateway }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className="h-11 rounded-xl px-4" onClick={() => setOpen(true)}>
        <IconRefresh />
        Sync from {gateway === "razorpay" ? "Razorpay" : "Stripe"}
      </Button>
      {open && <SyncDialog gateway={gateway} onClose={() => setOpen(false)} />}
    </>
  );
}

/** The ⋮ on a gateway row: change its status, or remove the local copy. */
export function GatewayRowMenu({ gateway, row }: { gateway: Gateway; row: GatewayRowRef }) {
  const [action, setAction] = useState<"status" | "delete" | null>(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${row.name}`}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <IconDotsVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-40 p-1.5">
          <DropdownMenuItem onClick={() => setAction("status")}>Change status</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-negative data-highlighted:text-negative"
            onClick={() => setAction("delete")}
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {action === "status" && (
        <GatewayStatusDialog gateway={gateway} row={row} onClose={() => setAction(null)} />
      )}
      {action === "delete" && (
        <DeleteGatewayDialog gateway={gateway} row={row} onClose={() => setAction(null)} />
      )}
    </>
  );
}
