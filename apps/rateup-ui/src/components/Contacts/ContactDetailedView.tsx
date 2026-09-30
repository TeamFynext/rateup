import { IconCheck, IconCopy, IconEdit, IconFolder, IconInbox, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import type { ComponentProps, ReactNode } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useAddExistingContactMutation,
  useContactGroup,
  useRemoveContactsFromGroup,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import {
  useContactFullDetails,
  useEditContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { useConversationsByContact } from "@/backend/whatsapp/inbox/message/wamessage.query.ts";
import ChipAddPicker from "@/components/common/chip-add-picker.tsx";
import { useContactTableStore } from "@/components/dashboard/contacts/store/contact-table-store.ts";
import {
  deriveStatus,
  STATUS_PILL_BASE,
} from "@/components/whatsapp/inbox/chatdisplay/chatdisplayHeader/ticket.ts";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { cn } from "@/lib/utils.ts";
import { copyToClipboard } from "@/utils/whatsappLink.ts";

import { Badge } from "../ui/badge.tsx";
import { Button, buttonVariants } from "../ui/button.tsx";
import { ContactAvatar } from "../ui/contact-avatar.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { FieldLabel } from "../ui/field.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { contactRowToInitialValues } from "./contact-form-schema.ts";
import CreateOrEditContactModal from "./CreatOrEditContactModal.tsx";
import { getSourceBadge } from "./utils/utils.tsx";

const formatDate = (value: string | Date | null | undefined) =>
  value ? dayjs(value).format("DD MMM YYYY") : null;

const formatDateTime = (value: string | Date | null | undefined) =>
  value ? dayjs(value).format("DD MMM YYYY, h:mm A") : null;

const STATUS_STYLES: Record<string, string> = {
  UNASSIGNED: "bg-muted text-foreground",
  ASSIGNED: "bg-ru-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
  RESOLVED: "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400",
  UNRESOLVED: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400",
  CLOSED: "bg-muted text-foreground",
  SPAM: "bg-destructive/10 text-destructive ",
};

/**
 * Copies `value`, then confirms in place for a moment. Sized to sit inline next to a
 * row's text without changing the row's height. Hidden until the row is hovered, but
 * `focus-visible` brings it back so it stays reachable from the keyboard.
 */
const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(value);
    if (!ok) {
      toast.error("Could not copy to clipboard");
      return;
    }
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100"
    >
      {copied ? (
        <IconCheck className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <IconCopy className="w-3.5 h-3.5" />
      )}
    </button>
  );
};

/**
 * One label/value line. The whole dialog is built from these so every fact lines up
 * on the same column, and a row with nothing to say removes itself rather than
 * printing a dash — which is what keeps the modal short for a sparse contact.
 *
 * Pass `copyValue` for a fact someone would want to paste elsewhere — a phone number,
 * an email, an id. Rendered values (a stage badge, a formatted date) leave it off.
 */
const Row = ({
  label,
  value,
  copyValue,
}: {
  label: string;
  value: ReactNode;
  copyValue?: string | null;
}) => {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="group/row flex items-start justify-between gap-6 py-2 border-b border-border/60 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-start gap-1.5 min-w-0">
        <div className="text-sm text-right wrap-anywhere">{value}</div>
        {copyValue && <CopyButton value={copyValue} label={label} />}
      </div>
    </div>
  );
};

/** A titled block. Renders nothing at all when it has no rows to show. */
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-1">
    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
    <div>{children}</div>
  </section>
);

/** One figure in the summary strip under the header. */
const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="min-w-0 rounded-lg bg-muted/50 px-3 py-2">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="mt-0.5 truncate text-sm font-medium">{value}</div>
  </div>
);

const RECENT_CONVERSATION_COUNT = 5;

/** A group as both the table row and the details endpoint carry it. */
type GroupRef = Pick<ContactGroup, "id" | "name">;

const ContactDetailedView = ({
  opened,
  setOpened,
  selectedContact,
  setIsEditOpen,
  showInboxLink = true,
  showConversations = true,
}: {
  opened: boolean;
  setOpened: (open: boolean) => void;
  selectedContact: ContactPreview;
  /** Off where the dialog is opened from the inbox itself. */
  showInboxLink?: boolean;
  /** Off in the inbox, whose thread already lists the contact's other conversations. */
  showConversations?: boolean;
  setIsEditOpen: (open: boolean) => void;
}) => {
  const [selectedGroup, setSelectedGroup] = useState<GroupRef | null>(null);
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState(selectedContact.notes ?? "");
  // Reopening starts from the saved notes, not a draft abandoned on the last close.
  const [wasOpened, setWasOpened] = useState(opened);
  if (opened !== wasOpened) {
    setWasOpened(opened);
    if (opened) setEditNotes(false);
  }
  const removeContacts = useRemoveContactsFromGroup(selectedGroup?.id ?? "");
  const addToGroup = useAddExistingContactMutation();
  const { data: allGroups = [] } = useContactGroup();
  const updateContact = useEditContactMutation();
  const confirm = useConfirm();

  // The table row carries only what its columns need. Assignees by name, custom
  // fields, lead and loyalty come from the detail endpoint — fetched only once the
  // dialog is open, so a 500-row page does not fire 500 requests.
  const { data: details, isPending: isLoadingDetails } = useContactFullDetails(
    selectedContact.id,
    opened,
  );
  const { data: conversations = [], isPending: isLoadingConversations } = useConversationsByContact(
    selectedContact.id,
    opened,
  );

  async function handleRemoveContactFromGroup(group: GroupRef, contactIds: string[]) {
    const shouldRemove = await confirm({
      title: "Remove Contact from Group",
      description: `Are you sure you want to remove ${selectedContact.name} from group ${group?.name}?`,
      confirmText: "Remove",
      cancelText: "Cancel",
    });

    if (!shouldRemove) {
      setSelectedGroup(null);
      return;
    }

    removeContacts.mutate(
      { contactIds, groupId: group.id },
      {
        onSuccess: () => {
          toast.success("contact removed from group");
        },
        onError: (error) => {
          toast.error(error?.message || "something went wrong");
        },
      },
    );
  }

  function handleSaveNotes() {
    updateContact.mutate(
      { contactId: selectedContact.id, data: { notes } },
      {
        onSuccess: () => {
          toast.success("notes saved");
          setEditNotes(false);
        },
        onError: (error) => {
          toast.error(error?.message || "Something went wrong");
        },
      },
    );
  }

  // Labels come back as `ContactLabelMap` from both endpoints; the row type also carries a
  // lower-cased alias.
  const labels =
    details?.ContactLabelMap ??
    selectedContact.ContactLabelMap ??
    selectedContact.contactLabelMap ??
    [];
  const assignees = details?.waInboxAssign ?? [];
  const customFields = (details?.customFields ?? []).filter((f) => f.field?.visibility !== false);
  const loyalty = details?.loyaltyAccounts?.[0];
  const campaigns = details?.campaignParticipants ?? [];
  const groups = details?.contactGroups ?? selectedContact.contactGroups ?? [];
  const savedNotes = details?.notes ?? selectedContact.notes ?? "";
  // A contact can sit on several boards; the stage shown here is the one Leads board's.
  const lead = details?.leads?.find((candidate) => candidate.pipeline?.type === "LEADS");
  const inboxStatus = details?.waMessageAssignStatus ?? selectedContact.waMessageAssignStatus;
  const lifecycleName = details?.Lifecycle?.name ?? selectedContact.Lifecycle?.name;
  const hasConsent = details?.consent ?? selectedContact.consent;
  const phone = details?.phone ?? selectedContact.phone;
  const contactName = details?.name ?? selectedContact.name;
  const lastReceived =
    details?.lastReceivedMessageTimeStamp ?? selectedContact.lastReceivedMessageTimeStamp;
  const recentConversations = conversations.slice(0, RECENT_CONVERSATION_COUNT);
  // Closing clears the table store's selection, which would otherwise reopen this dialog
  // when the user comes back to the contacts page.
  const inboxLink = (
    <Link
      to="/dashboard/inbox"
      search={{ tab: "open", contactId: selectedContact.id, history: true, reveal: true }}
      onClick={() => setOpened(false)}
    />
  );

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            <ContactAvatar
              name={contactName || phone}
              src={details?.profilePic ?? selectedContact.profilePic}
              size="lg"
            />
            <div className="min-w-0">
              <div className="group/row flex items-center gap-1.5">
                <DialogTitle className="truncate text-lg">{contactName}</DialogTitle>
                {contactName && <CopyButton value={contactName} label="Name" />}
              </div>
              <div className="group/row flex items-center gap-1.5">
                <DialogDescription>{phone}</DialogDescription>
                {phone && <CopyButton value={phone} label="Phone" />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {getSourceBadge(details?.source ?? selectedContact.source)}
            {inboxStatus && (
              <Badge
                variant="secondary"
                className={STATUS_STYLES[inboxStatus] ?? "bg-muted text-foreground"}
              >
                {inboxStatus}
              </Badge>
            )}
            {lifecycleName && <Badge variant="outline">{lifecycleName}</Badge>}
            {!hasConsent && (
              <Badge
                variant="secondary"
                className="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
              >
                No consent
              </Badge>
            )}
            {(details?.blockedOnWhatsApp ?? selectedContact.blockedOnWhatsApp) && (
              <Badge variant="secondary" className="bg-destructive/10 text-destructive ">
                Blocked
              </Badge>
            )}
            {details?.isSpam && (
              <Badge variant="secondary" className="bg-destructive/10 text-destructive ">
                Spam
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Conversations"
            value={isLoadingConversations ? <Skeleton className="h-4 w-8" /> : conversations.length}
          />
          <Stat label="Last received" value={formatDate(lastReceived) ?? "—"} />
          <Stat label="Campaigns" value={isLoadingDetails ? "—" : campaigns.length} />
          <Stat
            label={loyalty ? "Points" : "Added"}
            value={
              loyalty
                ? loyalty.currentPoints
                : (formatDate(details?.createdAt ?? selectedContact.createdAt) ?? "—")
            }
          />
        </div>

        <div className="grid max-h-[55vh] gap-x-8 gap-y-5 overflow-y-auto -mr-2 pr-2 md:grid-cols-2">
          <div className="space-y-5 min-w-0">
            <Section title="Contact">
              <Row label="Phone" value={phone} copyValue={phone} />
              <Row
                label="Email"
                value={details?.email ?? selectedContact.email}
                copyValue={details?.email ?? selectedContact.email}
              />
              <Row
                label="Address"
                value={details?.address ?? selectedContact.address}
                copyValue={details?.address ?? selectedContact.address}
              />
              <Row
                label="WhatsApp name"
                value={details?.whatsappUserName}
                copyValue={details?.whatsappUserName}
              />
              <Row
                label="Location"
                value={details?.other ?? selectedContact.other}
                copyValue={details?.other ?? selectedContact.other}
              />
              <Row label="Date of birth" value={formatDate(details?.dob ?? selectedContact.dob)} />
              <Row label="Consent" value={hasConsent ? "Given" : "Not given"} />
              <Row
                label="Added"
                value={formatDate(details?.createdAt ?? selectedContact.createdAt)}
              />
              <Row
                label="External ID"
                value={details?.external_id}
                copyValue={details?.external_id}
              />
            </Section>

            {customFields.length > 0 && (
              <Section title="Custom fields">
                {customFields.map((field) => (
                  <Row
                    key={field.id}
                    label={field.field?.name ?? "Field"}
                    value={field.value}
                    copyValue={field.value}
                  />
                ))}
              </Section>
            )}

            {loyalty && (
              <Section title="Loyalty">
                <Row label="Program" value={loyalty.program?.name} />
                <Row label="Tier" value={loyalty.currentTier?.name} />
                <Row
                  label="Points"
                  value={`${loyalty.currentPoints} available · ${loyalty.lifetimePoints} lifetime`}
                />
                <Row
                  label="Referral code"
                  value={loyalty.referralCode}
                  copyValue={loyalty.referralCode}
                />
              </Section>
            )}

            <Section title="Notes">
              <div className="space-y-2 pt-1">
                <FieldLabel htmlFor="contact-notes" className="sr-only">
                  Notes
                </FieldLabel>
                {editNotes ? (
                  <>
                    <Textarea
                      id="contact-notes"
                      placeholder="Add notes about this contact..."
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.currentTarget.value)}
                    />
                    <div className="space-x-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditNotes(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveNotes} loading={updateContact.isPending}>
                        Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm whitespace-pre-wrap wrap-anywhere">
                      {savedNotes || <span className="text-muted-foreground">No notes yet</span>}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Edit notes"
                      onClick={() => {
                        setNotes(savedNotes);
                        setEditNotes(true);
                      }}
                    >
                      <IconEdit className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          </div>

          <div className="space-y-5 min-w-0">
            {showConversations && (
              <Section title="Conversations">
                {isLoadingConversations ? (
                  <div className="space-y-1.5 pt-1">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : conversations.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {recentConversations.map((conversation) => {
                      const status = deriveStatus({
                        conversationStatus: conversation.status,
                        assignedUsers: conversation.assignedUsers,
                      });
                      return (
                        <div
                          key={conversation.id}
                          className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-2"
                        >
                          {conversation.number ? (
                            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                              #{conversation.number}
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {conversation.subject || (
                              <span className="text-muted-foreground">
                                {conversation.messageCount} messages
                              </span>
                            )}
                          </span>
                          <span className={`${STATUS_PILL_BASE} shrink-0 ${status.className}`}>
                            <span className="size-[5px] rounded-full bg-current" />
                            {status.label}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(conversation.lastMessageAt ?? conversation.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                    {conversations.length > RECENT_CONVERSATION_COUNT && (
                      <p className="text-xs text-muted-foreground">
                        +{conversations.length - RECENT_CONVERSATION_COUNT} older in the inbox
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-1">No conversations yet</p>
                )}
              </Section>
            )}

            <Section title="Activity">
              <Row label="Last received" value={formatDateTime(lastReceived)} />
              <Row label="Last sent" value={formatDateTime(details?.lastSentMessageTimeStamp)} />
              <Row
                label="Assigned to"
                value={
                  isLoadingDetails ? (
                    <Skeleton className="h-4 w-24" />
                  ) : assignees.length > 0 ? (
                    assignees
                      .map((a) => a.assignedUser?.name ?? a.assignedUser?.email)
                      .filter(Boolean)
                      .join(", ")
                  ) : (
                    "Nobody"
                  )
                }
              />
              {lead && (
                <Row
                  label="Lead stage"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      {lead.stage?.color && (
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: lead.stage.color }}
                        />
                      )}
                      {lead.stage?.name ?? lead.status}
                    </span>
                  }
                />
              )}
              {lead?.owner?.name && <Row label="Lead owner" value={lead.owner.name} />}
            </Section>

            <Section title="Labels">
              {isLoadingDetails ? (
                <Skeleton className="h-5 w-32" />
              ) : labels.length > 0 ? (
                <div className="flex gap-1 flex-wrap pt-1">
                  {labels.map((entry) => (
                    <Badge
                      key={entry.label?.id}
                      variant="outline"
                      style={
                        entry.label?.color
                          ? { borderColor: entry.label.color, color: entry.label.color }
                          : undefined
                      }
                    >
                      {entry.label?.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-1">No labels</p>
              )}
            </Section>

            <Section title="Groups">
              <div className="space-y-1 pt-1">
                {groups.length > 0 ? (
                  groups.map((entry: { contactGroup?: GroupRef }) => {
                    const group = entry.contactGroup;
                    return (
                      <div
                        key={group?.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1"
                      >
                        <span className="flex items-center gap-2 text-sm min-w-0">
                          <IconFolder className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{group?.name}</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove from ${group?.name}`}
                          onClick={() => {
                            setSelectedGroup(group ?? null);
                            handleRemoveContactFromGroup(group!, [selectedContact.id]);
                          }}
                        >
                          <IconX className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">Not in any group</p>
                )}
                <ChipAddPicker
                  options={allGroups}
                  activeIds={groups.map(
                    (entry: { contactGroup?: GroupRef }) => entry.contactGroup?.id ?? "",
                  )}
                  onAdd={(groupId) =>
                    addToGroup.mutate({ customerList: [selectedContact.id], groupId })
                  }
                  disabled={addToGroup.isPending}
                  label="Add to group"
                  placeholder="Search groups"
                  emptyText="No groups yet"
                  marker={() => <IconFolder className="size-4 shrink-0 text-muted-foreground" />}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}
                />
              </div>
            </Section>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpened(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setOpened(false);
              setIsEditOpen(true);
            }}
          >
            <IconEdit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          {showInboxLink && (
            <Button render={inboxLink}>
              <IconInbox className="w-4 h-4 mr-2" />
              View in inbox
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Enough of a contact to open the dialog on: the id it fetches the full record by, plus
 * whatever the opener already holds to paint before that lands.
 */
export type ContactPreview = Pick<ContactsData, "id"> & Partial<ContactsData>;

/**
 * The detail dialog with everything it hands off to (edit, add to group), for any screen
 * that shows a contact. The hand-offs are prefilled from the fetched record, so an opener
 * with only a partial row (the inbox's ticket) edits the same values the table would.
 */
export const ContactDetailDialog = ({
  contact,
  open,
  onOpenChange,
  showInboxLink,
  showConversations,
  onSaved,
}: {
  contact: ContactPreview;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showInboxLink?: boolean;
  showConversations?: boolean;
  onSaved?: ComponentProps<typeof CreateOrEditContactModal>["onSaved"];
}) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  // Same query key as the dialog's own fetch, so this reads the cache rather than refetching.
  const { data: details } = useContactFullDetails(contact.id, open || isEditOpen);
  const initialValues = useMemo(
    () => contactRowToInitialValues({ ...contact, ...details }),
    [contact, details],
  );

  return (
    <>
      <ContactDetailedView
        key={contact.id}
        opened={open}
        setOpened={onOpenChange}
        selectedContact={contact}
        setIsEditOpen={setIsEditOpen}
        showInboxLink={showInboxLink}
        showConversations={showConversations}
      />
      <CreateOrEditContactModal
        opened={isEditOpen}
        setOpened={setIsEditOpen}
        initialValues={initialValues}
        onSaved={onSaved}
      />
    </>
  );
};

/**
 * The one mounted copy of the detail dialog for a contacts table, driven by
 * `selectedContact` in the table store. Render this once per page that shows a contacts
 * table — a per-row copy would mount the whole stack 500 times on a full page.
 */
export const ContactDetailHost = () => {
  const selectedContact = useContactTableStore((state) => state.selectedContact);
  const setSelectedContact = useContactTableStore((state) => state.setSelectedContact);
  // Kept after the dialog closes so the hand-off modals still have a contact to act on.
  const [lastContact, setLastContact] = useState<ContactsData | null>(null);
  if (selectedContact && selectedContact !== lastContact) setLastContact(selectedContact);
  const contact = selectedContact ?? lastContact;

  if (!contact) return null;

  return (
    <ContactDetailDialog
      contact={contact}
      open={!!selectedContact}
      onOpenChange={(open) => {
        if (!open) setSelectedContact(null);
      }}
    />
  );
};

export default ContactDetailedView;
