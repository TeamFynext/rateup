import {
  IconAlertTriangle,
  IconArrowsLeftRight,
  IconSearch,
  IconStar,
  IconUserSearch,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import type {
  ContactIdentity,
  MergeConflict,
  MergeContact,
  MergePreview,
  MergeSide,
} from "@/backend/campaign/contacts/merge.api";
import { useMergeContactsMutation, useMergePreview } from "@/backend/campaign/contacts/merge.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { toText } from "@/utils/toText";

import { contactChannelHint, contactName, IdentityRow, mergeWarningText } from "./identity.tsx";

export interface MergeContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Both contacts known up front: a table selection or a suggestion. */
  contactIds?: readonly [string, string];
  /** One contact known: the dialog first asks which contact to merge it with. */
  contactId?: string;
  /** Resolves the suggestion when the merge goes through. */
  suggestionId?: string;
  /** Called once the merge succeeds: `sourceId` was deleted into `targetId`, the kept contact. */
  onMerged?: (result: { sourceId: string; targetId: string }) => void;
}

type Step = "pick" | "compare" | "confirm";

interface Pair {
  sourceId: string;
  targetId: string;
  /** False until the first preview has decided which side is kept by default. */
  oriented: boolean;
}

/**
 * Merges two contacts: pick the other contact (when only one is known), compare the two
 * side by side and choose the values that disagree, then confirm. The source is merged
 * into the target and deleted; the target is the contact that is kept.
 *
 * Mount it only while open (or key it by the pair) so each opening starts clean.
 */
export function MergeContactsDialog({
  open,
  onOpenChange,
  contactIds,
  contactId,
  suggestionId,
  onMerged,
}: Readonly<MergeContactsDialogProps>) {
  const { t } = useTranslation();
  const [pair, setPair] = useState<Pair | null>(() =>
    contactIds ? { sourceId: contactIds[0], targetId: contactIds[1], oriented: false } : null,
  );
  const [step, setStep] = useState<Step>(contactIds ? "compare" : "pick");
  const [choices, setChoices] = useState<Record<string, MergeSide>>({});

  const preview = useMergePreview(pair?.sourceId ?? null, pair?.targetId ?? null);
  const data =
    preview.data &&
    preview.data.source.id === pair?.sourceId &&
    preview.data.target.id === pair?.targetId
      ? preview.data
      : undefined;

  // Default: keep the older contact. Decided once, from the first preview; after that the
  // swap button is the only thing that moves the pair.
  useEffect(() => {
    if (!pair || pair.oriented || !data) return;
    const sourceIsOlder = dayjs(data.source.createdAt).isBefore(dayjs(data.target.createdAt));
    setPair(
      sourceIsOlder
        ? { sourceId: pair.targetId, targetId: pair.sourceId, oriented: true }
        : { ...pair, oriented: true },
    );
  }, [pair, data]);

  const swap = () => {
    if (!pair) return;
    setPair({ sourceId: pair.targetId, targetId: pair.sourceId, oriented: true });
    // Keep the picked *values*: what was the target's value is now the source's.
    setChoices((current) =>
      Object.fromEntries(
        Object.entries(current).map(([field, side]) => [
          field,
          side === "source" ? "target" : "source",
        ]),
      ),
    );
  };

  const merge = useMergeContactsMutation();
  const submit = () => {
    if (!pair) return;
    merge.mutate(
      {
        sourceId: pair.sourceId,
        targetId: pair.targetId,
        fieldChoices: choices,
        ...(suggestionId ? { suggestionId } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t("Contacts merged"));
          onOpenChange(false);
          onMerged?.({ sourceId: pair.sourceId, targetId: pair.targetId });
        },
        onError: (error) => toast.error(getApiErrorMessage(error, t("Could not merge contacts"))),
      },
    );
  };

  const ready = !!data && !!pair?.oriented;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {step === "pick" ? t("Merge with another contact") : t("Merge contacts")}
          </DialogTitle>
          <DialogDescription>
            {step === "pick"
              ? t("Find the contact that is the same person.")
              : step === "compare"
                ? t("Choose which contact to keep and which details it should have.")
                : t("Review the merge before it goes through.")}
          </DialogDescription>
        </DialogHeader>

        {step === "pick" && contactId && (
          <ContactSearch
            excludeId={contactId}
            onPick={(other) => {
              setPair({ sourceId: contactId, targetId: other.id, oriented: false });
              setStep("compare");
            }}
          />
        )}

        {step !== "pick" && preview.isError && !data && (
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertTitle>{t("Could not load these contacts")}</AlertTitle>
            <AlertDescription>
              {getApiErrorMessage(preview.error, t("Please try again."))}
            </AlertDescription>
          </Alert>
        )}

        {step !== "pick" && !preview.isError && !ready && <CompareSkeleton />}

        {step === "compare" && ready && data && (
          <CompareStep
            preview={data}
            choices={choices}
            onChoose={(field, side) => setChoices((c) => ({ ...c, [field]: side }))}
            onSwap={swap}
            swapping={preview.isFetching}
          />
        )}

        {step === "confirm" && ready && data && <ConfirmStep preview={data} />}

        {step !== "pick" && (
          <DialogFooter>
            {step === "compare" ? (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t("Cancel")}
                </Button>
                <Button disabled={!ready || preview.isFetching} onClick={() => setStep("confirm")}>
                  {t("Continue")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep("compare")}>
                  {t("Back")}
                </Button>
                <Button
                  variant="destructive"
                  disabled={!ready}
                  loading={merge.isPending}
                  onClick={submit}
                >
                  {t("Merge contacts")}
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

const SEARCH_PAGE = { pageIndex: 0, pageSize: 20 };

function ContactSearch({
  excludeId,
  onPick,
}: Readonly<{ excludeId: string; onPick: (contact: ContactsData) => void }>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const search = useDebounce(query.trim(), 300);
  const { data, isFetching } = useContacts(SEARCH_PAGE, search, undefined, undefined, undefined);
  const contacts = (data?.users ?? []).filter((contact) => contact.id !== excludeId);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("Search by name, phone, email or username")}
          aria-label={t("Search contacts")}
          className="pl-9"
        />
      </div>
      <div className="max-h-80 overflow-y-auto overscroll-contain rounded-lg border border-border p-1.5">
        {isFetching && contacts.length === 0 ? (
          <div className="flex flex-col gap-1.5 p-1">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-10 w-full" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {search ? t("Nobody matches “{query}”.", { query: search }) : t("No contacts yet.")}
          </p>
        ) : (
          contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => onPick(contact)}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-muted"
            >
              <CreativeAvatar name={contact.name || undefined} src={contact.profilePic} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {contactName(contact, t)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[contact.phone ? `+${contact.phone}` : null, contact.email]
                    .filter(Boolean)
                    .join(" · ") || t("No phone or email")}
                </span>
              </span>
              <IconUserSearch className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function CompareSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-28" />
      <Skeleton className="h-24" />
    </div>
  );
}

function fieldLabel(conflict: MergeConflict, t: TFunction): string {
  switch (conflict.field) {
    case "name":
      return t("Name");
    case "email":
      return t("Email");
    case "address":
      return t("Address");
    case "dob":
      return t("Birthday");
    case "gender":
      return t("Gender");
    case "notes":
      return t("Notes");
    case "lifecycleId":
      return t("Lifecycle stage");
    default:
      return conflict.label;
  }
}

function fieldValue(conflict: MergeConflict, side: MergeSide, preview: MergePreview): string {
  const value = conflict[side];
  if (value === null || value === undefined) return "—";
  if (conflict.field === "lifecycleId") {
    return preview.lifecycles.find((l) => l.id === value)?.name ?? toText(value);
  }
  if (conflict.field === "dob") {
    const date = dayjs(toText(value));
    return date.isValid() ? date.format("D MMM YYYY") : toText(value);
  }
  if (Array.isArray(value)) return value.join(", ");
  return toText(value);
}

function ContactCard({ contact, kept }: Readonly<{ contact: MergeContact; kept: boolean }>) {
  const { t } = useTranslation();
  const hint = contactChannelHint(contact, t);
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3 rounded-lg border p-3",
        kept ? "border-primary/40 bg-primary/5" : "border-border",
      )}
    >
      <CreativeAvatar name={contactName(contact, t)} src={contact.profilePic} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">
            {contactName(contact, t)}
          </span>
          {hint && <span className="shrink-0 text-xs text-muted-foreground">· {hint}</span>}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {t("Added {date}", { date: dayjs(contact.createdAt).format("D MMM YYYY") })}
        </div>
        <Badge variant={kept ? "default" : "outline"} className="mt-1.5">
          {kept ? <IconStar /> : null}
          {kept ? t("Kept") : t("Merged in, then removed")}
        </Badge>
      </div>
    </div>
  );
}

/** Identities per side, falling back to the contact columns for a contact not backfilled yet. */
function identitiesOf(preview: MergePreview, side: MergeSide): ContactIdentity[] {
  const rows = preview.identities.filter((row) => row.side === side);
  return rows.length ? rows : preview.legacyIdentities[side];
}

function CompareStep({
  preview,
  choices,
  onChoose,
  onSwap,
  swapping,
}: Readonly<{
  preview: MergePreview;
  choices: Record<string, MergeSide>;
  onChoose: (field: string, side: MergeSide) => void;
  onSwap: () => void;
  swapping: boolean;
}>) {
  const { t } = useTranslation();
  // A value both contacts hold (the same email on each) becomes one identity, so it is
  // listed once. Channel-scoped ids stay apart per channel.
  const identities = useMemo(() => {
    const seen = new Set<string>();
    return [...identitiesOf(preview, "target"), ...identitiesOf(preview, "source")].filter(
      (identity) => {
        const key = `${identity.kind}:${identity.channel?.id ?? ""}:${identity.value.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      },
    );
  }, [preview]);
  const { combined } = preview;
  const counts = [
    t("{count, plural, one {# conversation} other {# conversations}}", {
      count: combined.conversations,
    }),
    t("{count, plural, one {# message} other {# messages}}", { count: combined.messages }),
    t("{count, plural, one {# order} other {# orders}}", { count: combined.orders }),
    t("{count, plural, one {# campaign send} other {# campaign sends}}", {
      count: combined.campaignParticipations,
    }),
    t("{count, plural, one {# call} other {# calls}}", { count: combined.calls }),
  ];

  return (
    <div className={cn("flex flex-col gap-5", swapping && "opacity-60")}>
      {/* Header: the kept contact on the left, the one merged into it on the right. */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <ContactCard contact={preview.target} kept />
        <Button
          variant="outline"
          size="icon-sm"
          className="self-center"
          onClick={onSwap}
          disabled={swapping}
          aria-label={t("Swap which contact is kept")}
          title={t("Swap which contact is kept")}
        >
          <IconArrowsLeftRight />
        </Button>
        <ContactCard contact={preview.source} kept={false} />
      </div>

      {preview.conflicts.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            {t("These details differ. Pick the one to keep.")}
          </h3>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {preview.conflicts.map((conflict) => {
              const value = choices[conflict.field] ?? "target";
              return (
                <div key={conflict.field} className="flex flex-col gap-2 p-3">
                  <span className="text-[13px] font-semibold text-foreground">
                    {fieldLabel(conflict, t)}
                  </span>
                  <RadioGroup
                    value={value}
                    onValueChange={(next) => onChoose(conflict.field, next as MergeSide)}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    aria-label={fieldLabel(conflict, t)}
                  >
                    {(["target", "source"] as const).map((side) => (
                      <label
                        key={side}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-md border p-2 text-[13px]",
                          value === side ? "border-primary/50 bg-primary/5" : "border-border",
                        )}
                      >
                        <RadioGroupItem value={side} className="mt-0.5" />
                        <span className="min-w-0 break-words text-foreground">
                          {fieldValue(conflict, side, preview)}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">{t("Will be combined")}</h3>
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          {identities.length > 0 && (
            <div className="flex flex-col">
              {identities.map((identity, index) => (
                <IdentityRow key={identity.id ?? `${identity.kind}-${index}`} identity={identity} />
              ))}
            </div>
          )}
          {combined.labels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t("Labels")}</span>
              {combined.labels.map((label) => (
                <Badge key={label.id} variant="outline">
                  {label.color && (
                    <span
                      className="size-2 rounded-full"
                      style={{ background: label.color }}
                      aria-hidden
                    />
                  )}
                  {label.name}
                </Badge>
              ))}
            </div>
          )}
          {combined.audiences.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t("Audiences")}</span>
              {combined.audiences.map((audience) => (
                <Badge key={audience.id} variant="secondary">
                  {audience.name}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-[13px] text-foreground">{counts.join(" · ")}</p>
          {preview.loyalty.map((program) => (
            <p key={program.programId} className="text-[13px] text-foreground">
              <span className="font-semibold">{program.programName}: </span>
              {program.remove
                ? t(
                    "Keeps the {keep, number}-point account; the {remove, number}-point account is closed.",
                    { keep: program.keep.points, remove: program.remove.points },
                  )
                : t("The {points, number}-point loyalty account moves to the kept contact.", {
                    points: program.keep.points,
                  })}
            </p>
          ))}
        </div>
      </section>

      {preview.warnings.length > 0 && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <IconAlertTriangle className="text-amber-600" />
          <AlertTitle>{t("Before you merge")}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {preview.warnings.map((warning) => (
                <li key={warning}>{mergeWarningText(warning, t)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function ConfirmStep({ preview }: Readonly<{ preview: MergePreview }>) {
  const { t } = useTranslation();
  const describe = (contact: MergeContact) => {
    const hint = contactChannelHint(contact, t);
    const name = contactName(contact, t);
    return hint ? t("{name} ({channel})", { name, channel: hint }) : name;
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] font-semibold text-foreground">
        {t("Merge {source} into {target}", {
          source: describe(preview.source),
          target: describe(preview.target),
        })}
      </p>
      <Alert variant="destructive">
        <IconAlertTriangle />
        <AlertTitle>{t("This can't be undone")}</AlertTitle>
        <AlertDescription>
          {t(
            "{source} is deleted. Its conversations, orders, labels and identities move to {target}.",
            { source: contactName(preview.source, t), target: contactName(preview.target, t) },
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
