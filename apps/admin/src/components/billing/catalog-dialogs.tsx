import { useState } from "react";

import {
  useDeleteGatewayRow,
  useDeleteTier,
  useSetGatewayStatus,
  useSyncGateway,
  type GatewayPlanStatus,
  type RateupPlan,
} from "@/api/billing.api";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { humanize } from "@/lib/format";

type Gateway = "razorpay" | "stripe";
const GATEWAY_NAME: Record<Gateway, string> = { razorpay: "Razorpay", stripe: "Stripe" };
const ROW_NOUN: Record<Gateway, string> = { razorpay: "plan", stripe: "product" };

/** A gateway row as either page shows it: enough to name it and know if it is linked. */
export interface GatewayRowRef {
  id: string;
  name: string;
  status: GatewayPlanStatus;
  tier: { id: string; name: string } | null;
}

export function DeleteTierDialog({ plan, onClose }: { plan: RateupPlan; onClose: () => void }) {
  const mutation = useDeleteTier();
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive
      title={`Delete ${plan.displayName ?? plan.name}`}
      description="Gone from the catalogue for good. Gateway plans it sold through stay, unlinked."
      submitLabel="Delete plan"
      blocked={
        plan.orgs > 0
          ? `${plan.orgs} organisation(s) are still on this plan`
          : plan.packsSold > 0 && `${plan.packsSold} pack(s) of it have been sold`
      }
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { id: plan.id, reason },
          { onSuccess: () => done("Plan deleted.", onClose) },
        )
      }
    >
      {plan.orgs > 0 && (
        <Notice>
          {plan.orgs} organisation(s) are on this plan. Move each one with its Change plan first.
        </Notice>
      )}
      {plan.packsSold > 0 && (
        <Notice>
          {plan.packsSold} pack(s) were sold as this add-on; it can be retired but not deleted.
        </Notice>
      )}
    </ActionDialog>
  );
}

const STATUSES: { value: GatewayPlanStatus; label: string; hint: string }[] = [
  { value: "ACTIVE", label: "Active", hint: "On sale" },
  { value: "LIVE", label: "Live", hint: "On sale (legacy flag)" },
  { value: "INACTIVE", label: "Inactive", hint: "Cannot be bought" },
  { value: "NULL", label: "Unset", hint: "Never switched on" },
];

export function GatewayStatusDialog({
  gateway,
  row,
  onClose,
}: {
  gateway: Gateway;
  row: GatewayRowRef;
  onClose: () => void;
}) {
  const mutation = useSetGatewayStatus(gateway);
  const [status, setStatus] = useState<GatewayPlanStatus>(row.status);
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title={`${row.name} · status`}
      description={`Whether this ${GATEWAY_NAME[gateway]} ${ROW_NOUN[gateway]} can be bought. The price and the ${ROW_NOUN[gateway]} itself live at ${GATEWAY_NAME[gateway]}.`}
      submitLabel="Save status"
      blocked={status === row.status && "Choose a different status"}
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { id: row.id, status, reason },
          { onSuccess: () => done(`Now ${humanize(status).toLowerCase()}.`, onClose) },
        )
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="gateway-status">Status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as GatewayPlanStatus)}>
          <SelectTrigger id="gateway-status" className="h-9 w-full rounded-lg">
            <SelectValue>
              {(value: GatewayPlanStatus) =>
                STATUSES.find((option) => option.value === value)?.label ?? humanize(value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} <span className="text-muted-foreground">· {option.hint}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!row.tier && (status === "ACTIVE" || status === "LIVE") && (
        <Notice>
          No plan in the catalogue sells through this {ROW_NOUN[gateway]}, so switching it on puts
          nothing on sale until one is linked.
        </Notice>
      )}
    </ActionDialog>
  );
}

export function DeleteGatewayDialog({
  gateway,
  row,
  onClose,
}: {
  gateway: Gateway;
  row: GatewayRowRef;
  onClose: () => void;
}) {
  const mutation = useDeleteGatewayRow(gateway);
  const onSale = row.status === "ACTIVE" || row.status === "LIVE";
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive
      title={`Remove ${row.name}`}
      description={`Removes the local copy only; the ${ROW_NOUN[gateway]} still exists at ${GATEWAY_NAME[gateway]} and the next sync brings it back.`}
      submitLabel="Remove"
      blocked={
        row.tier
          ? `Linked to ${row.tier.name}; unlink it first`
          : onSale && "Still on sale; take it off sale first"
      }
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate({ id: row.id, reason }, { onSuccess: () => done("Removed.", onClose) })
      }
    >
      {row.tier && (
        <Notice>“{row.tier.name}” sells through it. Unlink it from that plan first.</Notice>
      )}
      {onSale && !row.tier && <Notice>Switch it off before removing it.</Notice>}
    </ActionDialog>
  );
}

export function SyncDialog({ gateway, onClose }: { gateway: Gateway; onClose: () => void }) {
  const mutation = useSyncGateway(gateway);
  const name = GATEWAY_NAME[gateway];
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title={`Sync from ${name}`}
      description={
        gateway === "razorpay"
          ? "Pulls every plan from the Razorpay account. New ones land switched off; ones retired there are switched off here. Nothing is deleted."
          : "Pulls products and their default prices from Stripe. New ones land switched off. Nothing is deleted or changed."
      }
      submitLabel="Sync now"
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { reason },
          {
            onSuccess: (result) =>
              done(
                gateway === "razorpay"
                  ? `${result.created} new, ${result.deactivated ?? 0} switched off, ${result.seen ?? 0} seen.`
                  : `${result.created} new; ${result.total ?? 0} in total.`,
                onClose,
              ),
          },
        )
      }
    />
  );
}
