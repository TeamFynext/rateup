import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState, type ReactNode } from "react";

import {
  orgSubscriptionQueryOptions,
  useAddOrgNote,
  useChangeExpiry,
  useChangePlan,
  useDeleteOrgNote,
  useEditOrgNote,
  useGrantPacks,
  useOverrideFeatures,
  useRevokePack,
  useSuspendOrg,
  useUnsuspendOrg,
  type OrgNote,
  type OrgSubscription,
  type SubscriptionFeatures,
} from "@/api/org-actions.api";
import { planOptionsQueryOptions } from "@/api/orgs.query";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";
import { ListSkeleton } from "@/components/ds/query-states";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatDate, formatNumber, isEffectivelyNever } from "@/lib/format";
import { cn } from "@/lib/utils";

import { endOfDayIso, ExpiryField, isFutureDay, toDateInput } from "./expiry-field";
import { completeFeatures, formatLimit, isUnlimited, LIMITS, SWITCHES } from "./features";
import { FeaturesEditor } from "./features-editor";

export type OrgAction =
  | { kind: "plan" }
  | { kind: "expiry" }
  | { kind: "limits" }
  | { kind: "grant-packs" }
  | { kind: "revoke-pack"; addonId: string; label: string }
  | { kind: "suspend" }
  | { kind: "unsuspend" }
  | { kind: "note"; note?: OrgNote }
  | { kind: "delete-note"; note: OrgNote };

/** What the suspension dialogs need from the org, which their page already has. */
export interface SuspensionTarget {
  name: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
}

interface SuspensionProps {
  orgId: string;
  onClose: () => void;
  org: SuspensionTarget;
}

/** Mirrors CONVERSATION_ADDON and ADDON_VALID_DAYS in the API's subscription catalog. */
const CONVERSATIONS_PER_PACK = 5_000;
const PACK_DAYS = 30;

/**
 * Every subscription change on an org page, opened from the header's Manage menu or the
 * Plan & billing tab. One is open at a time; `action` says which.
 */
/** The actions that need the subscription loaded before they can show anything useful. */
const NEEDS_SUBSCRIPTION = new Set(["plan", "expiry", "limits", "grant-packs"]);

export function OrgActionDialogs({
  orgId,
  org,
  action,
  onClose,
}: {
  orgId: string;
  org: SuspensionTarget;
  action: OrgAction | null;
  onClose: () => void;
}) {
  const needsSubscription = !!action && NEEDS_SUBSCRIPTION.has(action.kind);
  const subscription = useQuery({
    ...orgSubscriptionQueryOptions(orgId),
    enabled: needsSubscription,
  });
  const props = { orgId, onClose, subscription: subscription.data ?? null };
  const loading = needsSubscription && subscription.isPending;

  return (
    <>
      {loading && (
        <ActionDialog
          open
          onOpenChange={onClose}
          title="Loading…"
          submitLabel="Save"
          canSubmit={false}
          pending={false}
          error={subscription.error}
          onSubmit={() => {}}
        >
          <ListSkeleton rows={2} />
        </ActionDialog>
      )}
      {!loading && action?.kind === "plan" && <ChangePlanDialog {...props} />}
      {!loading && action?.kind === "expiry" && <ChangeExpiryDialog {...props} />}
      {!loading && action?.kind === "limits" && <EditLimitsDialog {...props} />}
      {!loading && action?.kind === "grant-packs" && <GrantPacksDialog {...props} />}
      {action?.kind === "revoke-pack" && (
        <RevokePackDialog orgId={orgId} onClose={onClose} action={action} />
      )}
      {action?.kind === "suspend" && <SuspendDialog orgId={orgId} onClose={onClose} org={org} />}
      {action?.kind === "unsuspend" && (
        <UnsuspendDialog orgId={orgId} onClose={onClose} org={org} />
      )}
      {action?.kind === "note" && (
        <NoteDialog
          key={action.note?.id ?? "new"}
          orgId={orgId}
          onClose={onClose}
          note={action.note}
        />
      )}
      {action?.kind === "delete-note" && (
        <DeleteNoteDialog orgId={orgId} onClose={onClose} note={action.note} />
      )}
    </>
  );
}

interface DialogProps {
  orgId: string;
  onClose: () => void;
  subscription: OrgSubscription | null;
}

/** The default expiry to offer: what they have, or a month from now when that has passed. */
function initialExpiry(subscription: OrgSubscription | null) {
  const current = subscription?.expiresAt;
  if (current && dayjs(current).isAfter(dayjs())) return toDateInput(current);
  return toDateInput(dayjs().add(1, "month").toDate());
}

function GatewayNotice({ subscription }: { subscription: OrgSubscription | null }) {
  if (!subscription?.gatewayRef) return null;
  return (
    <Notice>
      A payment gateway bills this org ({subscription.gatewayRef}). Its next renewal puts back the
      plan and expiry the customer pays for, overwriting a change made here.
    </Notice>
  );
}

function ChangePlanDialog({ orgId, onClose, subscription }: DialogProps) {
  const plans = useQuery(planOptionsQueryOptions);
  const mutation = useChangePlan(orgId);
  const [planId, setPlanId] = useState("");
  const [expiry, setExpiry] = useState(() => initialExpiry(subscription));
  const [keepCaps, setKeepCaps] = useState(true);
  const chosen = plans.data?.find((plan) => plan.id === planId);
  const planName = (id: string) => plans.data?.find((plan) => plan.id === id)?.name ?? "Choose";

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      wide
      title="Change plan"
      description={`On ${subscription?.plan?.name ?? "no plan"} now. The new plan's limits and features replace the current ones.`}
      submitLabel="Change plan"
      canSubmit={!!chosen && isFutureDay(expiry)}
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          {
            rateupPlanId: planId,
            expiresAt: endOfDayIso(expiry),
            preserveContractedCaps: keepCaps,
            reason,
          },
          { onSuccess: () => done(`Moved to ${chosen?.name}.`, onClose) },
        )
      }
    >
      <GatewayNotice subscription={subscription} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>New plan</Label>
          <Select value={planId} onValueChange={(value) => setPlanId(value ?? "")}>
            <SelectTrigger className="h-9 w-full rounded-lg px-4 shadow-none">
              <SelectValue>
                {(value: string) => (value ? planName(value) : "Choose a plan")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {plans.data?.map((plan) => (
                <SelectItem
                  key={plan.id}
                  value={plan.id}
                  disabled={plan.id === subscription?.plan?.id}
                >
                  {plan.name}
                  {plan.id === subscription?.plan?.id && " (current)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ExpiryField value={expiry} onChange={setExpiry} />
      </div>

      {chosen && (
        <FeatureComparison
          before={subscription?.features ?? null}
          after={chosen.features}
          afterLabel={chosen.name}
          keepCaps={subscription?.contractedCap && keepCaps}
        />
      )}

      {subscription?.contractedCap && (
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={keepCaps}
            onCheckedChange={(checked) => setKeepCaps(checked === true)}
            className="mt-0.5"
          />
          <span>
            Keep the contracted limits
            <span className="block text-xs text-muted-foreground">
              This org has negotiated ceilings on an unlimited tier. Untick to give it the tier's
              unlimited allowance instead.
            </span>
          </span>
        </label>
      )}
    </ActionDialog>
  );
}

/** Now against after, row by row; changed rows are marked. */
function FeatureComparison({
  before,
  after,
  afterLabel,
  keepCaps,
}: {
  before: Partial<SubscriptionFeatures> | null;
  after: Partial<SubscriptionFeatures> | null;
  afterLabel: string;
  keepCaps?: boolean;
}) {
  const rows = [
    ...LIMITS.map((limit) => {
      const was = limit.get(before);
      let next = limit.get(after);
      // A contracted cap survives onto an unlimited tier (withContractedCaps in the API).
      if (keepCaps && isUnlimited(next) && was !== undefined && !isUnlimited(was) && was > 0) {
        next = was;
      }
      return { key: limit.key, label: limit.label, was: formatLimit(was), next: formatLimit(next) };
    }),
    ...SWITCHES.map((gate) => ({
      key: gate.key,
      label: gate.label,
      was: gate.get(before) ? "On" : "Off",
      next: gate.get(after) ? "On" : "Off",
    })),
  ];

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium" />
            <th className="px-4 py-2.5 text-right font-medium">Now</th>
            <th className="px-4 py-2.5 text-right font-medium">{afterLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => {
            const changed = row.was !== row.next;
            return (
              <tr key={row.key}>
                <td className="px-4 py-2.5">{row.label}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground tabular">{row.was}</td>
                <td className={cn("px-4 py-2.5 text-right tabular", changed && "font-semibold")}>
                  {row.next}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChangeExpiryDialog({ orgId, onClose, subscription }: DialogProps) {
  const mutation = useChangeExpiry(orgId);
  const [expiry, setExpiry] = useState(() => initialExpiry(subscription));
  const current = subscription?.expiresAt;

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title="Change expiry"
      description={
        current
          ? isEffectivelyNever(current)
            ? "The plan has no end date now."
            : `The plan runs until ${formatDate(current)} now.`
          : undefined
      }
      submitLabel="Save expiry"
      canSubmit={isFutureDay(expiry) && !!subscription}
      pending={mutation.isPending}
      error={mutation.error ?? (!subscription ? { message: "No subscription to change." } : null)}
      onSubmit={(reason) =>
        mutation.mutate(
          { expiresAt: endOfDayIso(expiry), reason },
          { onSuccess: () => done(`Plan now runs until ${formatDate(expiry)}.`, onClose) },
        )
      }
    >
      <GatewayNotice subscription={subscription} />
      <ExpiryField value={expiry} onChange={setExpiry} from={current} />
    </ActionDialog>
  );
}

function EditLimitsDialog({ orgId, onClose, subscription }: DialogProps) {
  const mutation = useOverrideFeatures(orgId);
  const [draft, setDraft] = useState(() => completeFeatures(subscription?.features));
  const planFeatures = subscription?.planFeatures ?? null;
  const update = (change: (features: SubscriptionFeatures) => void) =>
    setDraft((current) => {
      const next = structuredClone(current);
      change(next);
      return next;
    });

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      wide
      title="Edit limits"
      description={`Overrides for this org only. The ${subscription?.plan?.name ?? "plan"} default is shown under each one.`}
      submitLabel="Save limits"
      canSubmit={!!subscription}
      pending={mutation.isPending}
      error={mutation.error ?? (!subscription ? { message: "No subscription to change." } : null)}
      onSubmit={(reason) =>
        mutation.mutate(
          { features: draft, reason },
          { onSuccess: () => done("Limits saved.", onClose) },
        )
      }
    >
      <GatewayNotice subscription={subscription} />
      <FeaturesEditor draft={draft} onChange={update} reference={planFeatures} />

      {planFeatures && (
        <button
          type="button"
          onClick={() => setDraft(completeFeatures(planFeatures))}
          className="w-fit text-xs font-medium tracking-wide uppercase underline-offset-4 hover:underline"
        >
          Reset everything to the plan
        </button>
      )}
    </ActionDialog>
  );
}

function GrantPacksDialog({ orgId, onClose, subscription }: DialogProps) {
  const mutation = useGrantPacks(orgId);
  const [quantity, setQuantity] = useState(1);
  const planMax = subscription?.features?.whatsapp?.conversation?.count?.max;
  const metered = planMax !== undefined && planMax > 0 && !isUnlimited(planMax);
  const until = dayjs().add(PACK_DAYS, "day").toDate();

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title="Grant conversation packs"
      description={`Free extra conversations on top of the plan, for ${PACK_DAYS} days. Nothing is charged.`}
      submitLabel={`Grant ${quantity} ${quantity === 1 ? "pack" : "packs"}`}
      canSubmit={metered}
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { quantity, reason },
          {
            onSuccess: () =>
              done(`Granted ${quantity} ${quantity === 1 ? "pack" : "packs"}.`, onClose),
          },
        )
      }
    >
      {!metered ? (
        <Notice>
          This plan's conversations are not metered, so a pack would add nothing. Change the plan or
          its limits instead.
        </Notice>
      ) : (
        <div className="flex flex-col gap-3">
          <Label>Packs</Label>
          <div className="flex items-center gap-3">
            <StepButton
              label="One fewer"
              disabled={quantity <= 1}
              onClick={() => setQuantity((n) => n - 1)}
            >
              <IconMinus />
            </StepButton>
            <span className="w-10 text-center text-2xl font-medium tabular">{quantity}</span>
            <StepButton
              label="One more"
              disabled={quantity >= 20}
              onClick={() => setQuantity((n) => n + 1)}
            >
              <IconPlus />
            </StepButton>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatNumber(quantity * CONVERSATIONS_PER_PACK)} extra conversations, on top of the
            plan's {formatNumber(planMax)}, until {formatDate(until)}.
          </p>
        </div>
      )}
    </ActionDialog>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-xl border transition-colors hover:bg-muted disabled:opacity-40 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

function RevokePackDialog({
  orgId,
  onClose,
  action,
}: {
  orgId: string;
  onClose: () => void;
  action: Extract<OrgAction, { kind: "revoke-pack" }>;
}) {
  const mutation = useRevokePack(orgId);
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive
      title="End this pack now"
      description={`${action.label} stops counting immediately. The grant stays in the audit log.`}
      submitLabel="End pack"
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { addonId: action.addonId, reason },
          { onSuccess: () => done("Pack ended.", onClose) },
        )
      }
    />
  );
}

function SuspendDialog({ orgId, onClose, org }: SuspensionProps) {
  const mutation = useSuspendOrg(orgId);
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive
      title={`Suspend ${org.name}`}
      description="Everyone here is signed out of the product, their API key stops working, no message goes out, and campaigns in flight are paused."
      submitLabel="Suspend"
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate({ reason }, { onSuccess: () => done("Organisation suspended.", onClose) })
      }
    >
      <Notice>
        The customer sees only that the account is suspended and to contact support. Your reason
        stays in the audit log.
      </Notice>
    </ActionDialog>
  );
}

function UnsuspendDialog({ orgId, onClose, org }: SuspensionProps) {
  const mutation = useUnsuspendOrg(orgId);
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title={`Restore ${org.name}`}
      description={
        org.suspendedReason
          ? `Suspended because: “${org.suspendedReason}”.`
          : "Everything starts working again straight away."
      }
      submitLabel="Restore access"
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate({ reason }, { onSuccess: () => done("Access restored.", onClose) })
      }
    >
      <Notice tone="info">
        Campaigns paused by the suspension stay paused — whether to send the rest of an audience is
        the customer's call, from their own Resume.
      </Notice>
    </ActionDialog>
  );
}

function NoteDialog({
  orgId,
  onClose,
  note,
}: {
  orgId: string;
  onClose: () => void;
  note?: OrgNote;
}) {
  const add = useAddOrgNote(orgId);
  const edit = useEditOrgNote(orgId);
  const mutation = note ? edit : add;
  const [pinned, setPinned] = useState(note?.pinned ?? false);

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title={note ? "Edit note" : "Add a note"}
      description="Context for whoever picks this account up next. The customer never sees it."
      submitLabel={note ? "Save note" : "Add note"}
      reasonLabel="Note"
      reasonPlaceholder="What happened, what was agreed, what to watch for."
      initialReason={note?.body ?? ""}
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(body) =>
        note
          ? edit.mutate(
              { noteId: note.id, body, pinned },
              { onSuccess: () => done("Note saved.", onClose) },
            )
          : add.mutate({ body, pinned }, { onSuccess: () => done("Note added.", onClose) })
      }
    >
      <label className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
        <span className="text-sm">
          Pin to the top
          <span className="block text-xs text-muted-foreground">
            Pinned notes also show on the Overview tab.
          </span>
        </span>
        <Switch checked={pinned} onCheckedChange={setPinned} />
      </label>
    </ActionDialog>
  );
}

function DeleteNoteDialog({
  orgId,
  onClose,
  note,
}: {
  orgId: string;
  onClose: () => void;
  note: OrgNote;
}) {
  const mutation = useDeleteOrgNote(orgId);
  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive
      title="Delete this note"
      description={`“${note.body.slice(0, 120)}${note.body.length > 120 ? "…" : ""}”`}
      submitLabel="Delete note"
      pending={mutation.isPending}
      error={mutation.error}
      requireReason={false}
      onSubmit={() => mutation.mutate(note.id, { onSuccess: () => done("Note deleted.", onClose) })}
    />
  );
}
