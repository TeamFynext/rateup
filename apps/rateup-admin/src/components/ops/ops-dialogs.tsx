import { useId, useState } from "react";

import {
  useAddReferral,
  useDeleteReferral,
  useUnlinkShopify,
  type Referral,
  type ShopifyStore,
} from "@/api/ops.api";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/format";

export function AddReferralDialog({ onClose }: { onClose: () => void }) {
  const mutation = useAddReferral();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const nameId = useId();
  const emailId = useId();
  const ready = name.trim().length > 0 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title="Add a referral partner"
      description="A code is made from the name; their link is shown on the list once created."
      submitLabel="Add partner"
      canSubmit={ready}
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { name: name.trim(), email: email.trim(), reason },
          { onSuccess: () => done("Partner added.", onClose) },
        )
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-9 rounded-lg"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-9 rounded-lg"
        />
        <p className="text-xs text-muted-foreground">
          How you reach them; never shown to customers.
        </p>
      </div>
    </ActionDialog>
  );
}

export function DeleteReferralDialog({
  referral,
  onClose,
}: {
  referral: Referral;
  onClose: () => void;
}) {
  const mutation = useDeleteReferral();
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive
      title={`Remove ${referral.name}`}
      description="Their link stops working. The totals are kept on the audit row."
      submitLabel="Remove partner"
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { id: referral.id, reason },
          { onSuccess: () => done("Partner removed.", onClose) },
        )
      }
    >
      {(referral.visits > 0 || referral.signups > 0) && (
        <Notice>
          This partner brought {formatNumber(referral.visits)} visit(s) and{" "}
          {formatNumber(referral.signups)} sign-up(s).
        </Notice>
      )}
    </ActionDialog>
  );
}

export function UnlinkShopifyDialog({
  store,
  onClose,
}: {
  store: ShopifyStore;
  onClose: () => void;
}) {
  const mutation = useUnlinkShopify();
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive
      title={`Unlink ${store.shop ?? "this store"}`}
      description="Removes the link between the store and the organisation here. The store itself and its app install are untouched."
      submitLabel="Unlink store"
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { id: store.id, reason },
          { onSuccess: () => done("Store unlinked.", onClose) },
        )
      }
    >
      <Notice tone="info">
        If the merchant still has the app installed, the link comes back on their next sync. Use
        this for a stale or duplicated row.
      </Notice>
    </ActionDialog>
  );
}
