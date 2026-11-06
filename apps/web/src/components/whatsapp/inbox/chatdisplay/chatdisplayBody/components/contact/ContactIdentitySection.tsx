import {
  IconGitMerge,
  IconPencil,
  IconPlus,
  IconStar,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type {
  ContactIdentity,
  ContactIdentityOverview,
  IdentityKind,
} from "@/backend/campaign/contacts/merge.api";
import {
  useAddContactIdentity,
  useContactIdentityOverview,
  useRemoveContactIdentity,
  useUpdateContactIdentity,
} from "@/backend/campaign/contacts/merge.query";
import {
  contactName,
  identityLabel,
  IdentityRow,
  suggestionReasonText,
} from "@/components/Contacts/merge/identity.tsx";
import { MergeContactsDialog } from "@/components/Contacts/merge/MergeContactsDialog.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils.ts";
import { applyContactMerged } from "@/store/contact-merged.ts";
import { asApiError, getApiErrorData, getApiErrorMessage } from "@/utils/apiError.ts";

type MergeRequest = { kind: "pick" } | { kind: "pair"; otherId: string; suggestionId?: string };

/**
 * The inbox panel's identity block: every phone, email and channel account the contact is
 * known by, a "possible duplicate" banner, adding a phone or email by hand, and the
 * contact's merge history.
 */
export function ContactIdentitySection({
  contactId,
  embedded = false,
  hideKinds,
  title,
  emptyText,
}: Readonly<{
  contactId: string;
  /** Inside another layout (the contact view): no panel padding or border of its own. */
  embedded?: boolean;
  /**
   * Kinds edited elsewhere on the same screen (the edit form's phone and email fields).
   * Hiding PHONE and EMAIL also hides "Add phone or email".
   */
  hideKinds?: IdentityKind[];
  title?: string;
  emptyText?: string;
}>) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const canRead = can("contacts.read");
  const canManage = can("contacts.manage");
  const canMerge = can("contacts.merge");
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { data, isPending } = useContactIdentityOverview(contactId, canRead);
  const add = useAddContactIdentity(contactId);
  const remove = useRemoveContactIdentity(contactId);
  const update = useUpdateContactIdentity(contactId);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [merge, setMerge] = useState<MergeRequest | null>(null);

  if (!canRead) return null;

  const allIdentities = data
    ? data.identities.length
      ? data.identities
      : data.legacyIdentities
    : [];
  const identities = hideKinds
    ? allIdentities.filter((identity) => !hideKinds.includes(identity.kind))
    : allIdentities;
  const canAddHere = !hideKinds?.includes("PHONE") && !hideKinds?.includes("EMAIL");
  // A contact keeps at least one identity, counted across the kinds shown elsewhere too.
  const removable = canManage && allIdentities.filter((identity) => identity.id).length > 1;

  // Another contact already holding the value is the one refusal worth more than a toast:
  // they are probably the same person, so offer the merge.
  const onSaveError = async (error: unknown, value: string, fallback: string) => {
    const owner = getApiErrorData(error)?.ownerContactId;
    if (asApiError(error).response?.status === 409 && typeof owner === "string") {
      if (!canMerge) {
        toast.error(t("Another contact already has this."));
        return;
      }
      const ok = await confirm({
        title: t("Another contact already has this"),
        description: t(
          "{value} belongs to a different contact. If they are the same person, merge the two.",
          { value },
        ),
        confirmText: t("Merge with that contact"),
        cancelText: t("Cancel"),
      });
      if (ok) setMerge({ kind: "pair", otherId: owner });
      return;
    }
    toast.error(getApiErrorMessage(error, fallback));
  };

  const saveEdit = () => {
    if (!editing) return;
    const value = editing.value.trim();
    if (!value) return;
    update.mutate(
      { identityId: editing.id, value },
      {
        onSuccess: () => setEditing(null),
        onError: (error) => void onSaveError(error, value, t("Could not save this")),
      },
    );
  };

  const makeMain = (identity: ContactIdentity) => {
    if (!identity.id) return;
    update.mutate(
      { identityId: identity.id, isPrimary: true },
      {
        onSuccess: () => toast.success(t("Main {kind} changed", { kind: kindNoun(identity, t) })),
        onError: (error) => toast.error(getApiErrorMessage(error, t("Could not save this"))),
      },
    );
  };

  const submitDraft = () => {
    const value = draft.trim();
    if (!value) return;
    add.mutate(
      { kind: value.includes("@") ? "EMAIL" : "PHONE", value },
      {
        onSuccess: () => {
          setDraft("");
          setAdding(false);
          toast.success(t("Added"));
        },
        onError: (error) => void onSaveError(error, value, t("Could not add this")),
      },
    );
  };

  const removeIdentity = async (identityId: string, label: string) => {
    const ok = await confirm({
      title: t("Remove {value}?", { value: label }),
      description: t("This contact will no longer be matched or reached on it."),
      confirmText: t("Remove"),
      cancelText: t("Cancel"),
    });
    if (!ok) return;
    remove.mutate(identityId, {
      onError: (error) => toast.error(getApiErrorMessage(error, t("Could not remove this"))),
    });
  };

  return (
    <div className={embedded ? undefined : "border-b border-border px-4 py-3.5"}>
      <div className="mb-2.5 flex min-h-5 items-center justify-between">
        <span
          className={cn(
            "text-xs font-medium text-muted-foreground",
            embedded && "uppercase tracking-wide",
          )}
        >
          {title ?? t("Identities")}
        </span>
        {canMerge && (
          <button
            type="button"
            onClick={() => setMerge({ kind: "pick" })}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-primary transition-colors hover:bg-muted"
          >
            <IconGitMerge className="size-3.5" />
            {t("Merge with…")}
          </button>
        )}
      </div>

      {data?.suggestions.map((suggestion) => (
        <Alert key={suggestion.id} className="mb-2.5 border-amber-500/40 bg-amber-500/10 py-2">
          <IconUsers className="text-amber-600" />
          <AlertDescription className="text-[12px] text-foreground">
            <span>
              {t("Possible duplicate of {name}", { name: contactName(suggestion.contact, t) })}
            </span>
            <span className="block text-muted-foreground">
              {suggestionReasonText(suggestion, suggestion.contact, t)}
            </span>
            {canMerge && (
              <Button
                variant="link"
                size="xs"
                className="h-auto px-0"
                onClick={() =>
                  setMerge({
                    kind: "pair",
                    otherId: suggestion.contact.id,
                    suggestionId: suggestion.id,
                  })
                }
              >
                {t("Review")}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ))}

      {isPending ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      ) : (
        <div className="flex flex-col">
          {identities.map((identity, index) => {
            const key = identity.id ?? `${identity.kind}-${index}`;
            const editable =
              canManage &&
              !!identity.id &&
              (identity.kind === "PHONE" || identity.kind === "EMAIL");
            // "Main" only means something when there is more than one of the kind.
            const several = identities.filter((other) => other.kind === identity.kind).length > 1;
            if (editing && editing.id === identity.id) {
              return (
                <form
                  key={key}
                  className="my-1 flex items-center gap-1.5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveEdit();
                  }}
                >
                  <Input
                    autoFocus
                    value={editing.value}
                    onChange={(event) => setEditing({ ...editing, value: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setEditing(null);
                    }}
                    aria-label={
                      identity.kind === "EMAIL" ? t("Edit email") : t("Edit phone number")
                    }
                    inputMode={identity.kind === "PHONE" ? "tel" : "email"}
                    className="h-8 text-[13px]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    loading={update.isPending}
                    disabled={!editing.value.trim()}
                  >
                    {t("Save")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("Cancel")}
                    onClick={() => setEditing(null)}
                  >
                    <IconX />
                  </Button>
                </form>
              );
            }
            return (
              <IdentityRow
                key={key}
                identity={identity}
                trailing={
                  <span className="flex items-center gap-0.5">
                    {several && identity.isPrimary && (
                      <Badge variant="secondary" className="mr-1">
                        {t("Main")}
                      </Badge>
                    )}
                    {editable && several && !identity.isPrimary && (
                      <IconButton
                        label={t("Make main {kind}", { kind: kindNoun(identity, t) })}
                        disabled={update.isPending}
                        onClick={() => makeMain(identity)}
                      >
                        <IconStar className="size-3.5" />
                      </IconButton>
                    )}
                    {editable && (
                      <IconButton
                        label={t("Edit {value}", { value: identityLabel(identity, t) })}
                        onClick={() =>
                          setEditing({
                            id: identity.id ?? "",
                            value:
                              identity.kind === "PHONE" ? `+${identity.value}` : identity.value,
                          })
                        }
                      >
                        <IconPencil className="size-3.5" />
                      </IconButton>
                    )}
                    {removable && identity.id && (
                      <IconButton
                        label={t("Remove {value}", { value: identityLabel(identity, t) })}
                        disabled={remove.isPending}
                        onClick={() =>
                          void removeIdentity(identity.id ?? "", identityLabel(identity, t))
                        }
                      >
                        <IconX className="size-3.5" />
                      </IconButton>
                    )}
                  </span>
                }
              />
            );
          })}
          {identities.length === 0 && (
            <span className="text-[13px] text-muted-foreground">
              {emptyText ?? t("No identities yet")}
            </span>
          )}
        </div>
      )}

      {canManage &&
        canAddHere &&
        (adding ? (
          <form
            className="mt-2 flex items-center gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              submitDraft();
            }}
          >
            <Input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("Phone or email")}
              aria-label={t("Phone or email")}
              className="h-8 text-[13px]"
            />
            <Button type="submit" size="sm" loading={add.isPending} disabled={!draft.trim()}>
              {t("Add")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("Cancel")}
              onClick={() => {
                setAdding(false);
                setDraft("");
              }}
            >
              <IconX />
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconPlus className="size-3" />
            {t("Add phone or email")}
          </button>
        ))}

      {data && data.merges.length > 0 && <MergeHistory merges={data.merges} />}

      {merge && (
        <MergeContactsDialog
          open
          onOpenChange={(open) => {
            if (!open) setMerge(null);
          }}
          {...(merge.kind === "pair"
            ? {
                contactIds: [contactId, merge.otherId] as const,
                suggestionId: merge.suggestionId,
              }
            : { contactId })}
          onMerged={({ sourceId, targetId }) =>
            void applyContactMerged(queryClient, {
              sourceContactId: sourceId,
              targetContactId: targetId,
            })
          }
        />
      )}
    </div>
  );
}

/** "phone" or "email", for "Make main phone". */
function kindNoun(identity: ContactIdentity, t: TFunction) {
  return identity.kind === "EMAIL" ? t("email") : t("phone");
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: Readonly<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function MergeHistory({ merges }: Readonly<{ merges: ContactIdentityOverview["merges"] }>) {
  const { t } = useTranslation();
  return (
    <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-2.5">
      {merges.map((merge) => {
        const date = dayjs(merge.createdAt).format("D MMM YYYY");
        const name = merge.sourceName || t("another contact");
        const text =
          merge.reason === "HANDOFF"
            ? t("Linked automatically from a WhatsApp link on {date}", { date })
            : merge.mergedByName
              ? t("Merged with {name} by {user} on {date}", {
                  name,
                  user: merge.mergedByName,
                  date,
                })
              : t("Merged with {name} on {date}", { name, date });
        return (
          <li key={merge.id} className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
            <IconGitMerge className="mt-0.5 size-3 shrink-0" aria-hidden />
            <span>{text}</span>
          </li>
        );
      })}
    </ul>
  );
}
