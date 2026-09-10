import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconFolder,
  IconPlus,
  IconSend,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { useRemoveContactsFromGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import {
  useContactFullDetails,
  useEditContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { useContactTableStore } from "@/components/dashboard/contacts/store/contact-table-store.ts";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { copyToClipboard } from "@/utils/whatsappLink.ts";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar.tsx";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
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
import { Spinner } from "../ui/spinner.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { getInitials } from "../ui/utils.ts";
import AddToGroupModal from "./AddToGroupModal.tsx";
import SendMessageModal from "./SendMessageModal.tsx";
import { getSourceBadge } from "./utils/utils.tsx";

const formatDate = (value: string | Date | null | undefined) =>
  value ? dayjs(value).format("DD MMM YYYY") : null;

const formatDateTime = (value: string | Date | null | undefined) =>
  value ? dayjs(value).format("DD MMM YYYY, h:mm A") : null;

const STATUS_STYLES: Record<string, string> = {
  UNASSIGNED: "bg-gray-100 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
  UNRESOLVED: "bg-amber-100 text-amber-700",
  CLOSED: "bg-slate-200 text-slate-700",
  SPAM: "bg-red-100 text-red-700",
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

const ContactDetailedView = ({
  opened,
  setOpened,
  selectedContact,
  setIsSendMessageOpen,
  setIsAddToGroupOpen,
}: {
  opened: boolean;
  setOpened: (open: boolean) => void;
  selectedContact: ContactsData;
  setIsSendMessageOpen: (open: boolean) => void;
  setIsAddToGroupOpen: (open: boolean) => void;
}) => {
  const [selectedGroup, setSelectedGroup] = useState<ContactGroup | null>(null);
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState(selectedContact.notes);
  const removeContacts = useRemoveContactsFromGroup(selectedGroup?.id ?? "");
  const updateContact = useEditContactMutation();
  const confirm = useConfirm();

  // The table row carries only what its columns need. Assignees by name, custom
  // fields, lead and loyalty come from the detail endpoint — fetched only once the
  // dialog is open, so a 500-row page does not fire 500 requests.
  const { data: details, isPending: isLoadingDetails } = useContactFullDetails(
    selectedContact.id,
    opened,
  );

  async function handleRemoveContactFromGroup(group: ContactGroup, contactIds: string[]) {
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
  // lower-cased alias, which is what this dialog used to read — and why labels never showed.
  const labels =
    details?.ContactLabelMap ??
    selectedContact.ContactLabelMap ??
    selectedContact.contactLabelMap ??
    [];
  const assignees = details?.waInboxAssign ?? [];
  const customFields = (details?.customFields ?? []).filter((f) => f.field?.visibility !== false);
  const loyalty = details?.loyaltyAccounts?.[0];
  const campaigns = details?.campaignParticipants ?? [];
  const groups = selectedContact.contactGroups ?? [];
  // One board per org, so the first lead is the whole pipeline answer.
  const lead = details?.leads?.[0];
  const inboxStatus = details?.waMessageAssignStatus ?? selectedContact.waMessageAssignStatus;
  const lifecycleName = details?.Lifecycle?.name ?? selectedContact.Lifecycle?.name;
  const hasConsent = details?.consent ?? selectedContact.consent;
  const phone = details?.phone ?? selectedContact.phone;
  const contactName = details?.name ?? selectedContact.name;

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={details?.profilePic ?? selectedContact.profilePic} />
              <AvatarFallback className="bg-linear-to-r from-primary to-blue-600 text-white">
                {getInitials(selectedContact.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="group/row flex items-center gap-1.5">
                <DialogTitle className="truncate">{contactName}</DialogTitle>
                {contactName && <CopyButton value={contactName} label="Name" />}
              </div>
              <div className="group/row flex items-center gap-1.5">
                <DialogDescription>{phone}</DialogDescription>
                {phone && <CopyButton value={phone} label="Phone" />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {getSourceBadge(details?.source ?? selectedContact.source)}
            {inboxStatus && (
              <Badge
                variant="secondary"
                className={STATUS_STYLES[inboxStatus] ?? "bg-gray-100 text-gray-700"}
              >
                {inboxStatus}
              </Badge>
            )}
            {lifecycleName && <Badge variant="outline">{lifecycleName}</Badge>}
            {!hasConsent && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                No consent
              </Badge>
            )}
            {(details?.blockedOnWhatsApp ?? selectedContact.blockedOnWhatsApp) && (
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                Blocked
              </Badge>
            )}
            {details?.isSpam && (
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                Spam
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto space-y-5 -mr-2 pr-2">
          <Section title="Contact">
            <Row label="Phone" value={phone} copyValue={phone} />
            <Row
              label="Email"
              value={details?.email ?? selectedContact.email}
              copyValue={details?.email ?? selectedContact.email}
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

          <Section title="Activity">
            <Row
              label="Last received"
              value={formatDateTime(
                details?.lastReceivedMessageTimeStamp ??
                  selectedContact.lastReceivedMessageTimeStamp,
              )}
            />
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
            <Row label="Campaigns" value={campaigns.length > 0 ? campaigns.length : null} />
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

          <Section title="Groups">
            <div className="space-y-1 pt-1">
              {groups.length > 0 ? (
                groups.map((entry: { contactGroup?: ContactGroup }) => {
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
              <Button
                size="sm"
                variant="outline"
                className="mt-1"
                onClick={() => {
                  setOpened(false);
                  setIsAddToGroupOpen(true);
                }}
              >
                <IconPlus className="w-4 h-4 mr-1" />
                Add to group
              </Button>
            </div>
          </Section>

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
                    <Button size="sm" onClick={handleSaveNotes}>
                      {updateContact.isPending && <Spinner />}
                      Save
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm whitespace-pre-wrap wrap-anywhere">
                    {selectedContact.notes || (
                      <span className="text-muted-foreground">No notes yet</span>
                    )}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Edit notes"
                    onClick={() => {
                      setNotes(selectedContact.notes);
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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpened(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              setOpened(false);
              setIsSendMessageOpen(true);
            }}
          >
            <IconSend className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * The one mounted copy of the detail dialog for a contacts table, driven by
 * `selectedContact` in the table store. Clicking a name in the Name column sets that
 * field; everything the dialog hands off to (send message, add to group) hangs off the
 * same instance. Render this once per page that shows a contacts table — a per-row copy
 * would mount the whole stack 500 times on a full page.
 */
export const ContactDetailHost = () => {
  const selectedContact = useContactTableStore((state) => state.selectedContact);
  const setSelectedContact = useContactTableStore((state) => state.setSelectedContact);
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [isAddToGroupOpen, setIsAddToGroupOpen] = useState(false);
  // Kept after the dialog closes so the hand-off modals still have a contact to act on.
  const [handOffContact, setHandOffContact] = useState<ContactsData | null>(null);
  const contact = selectedContact ?? handOffContact;

  if (!contact) return null;

  return (
    <>
      <ContactDetailedView
        opened={!!selectedContact}
        setOpened={(open) => {
          if (!open) setSelectedContact(null);
        }}
        selectedContact={contact}
        setIsSendMessageOpen={(open) => {
          setHandOffContact(contact);
          setIsSendMessageOpen(open);
        }}
        setIsAddToGroupOpen={(open) => {
          setHandOffContact(contact);
          setIsAddToGroupOpen(open);
        }}
      />
      <SendMessageModal
        opened={isSendMessageOpen}
        setOpened={setIsSendMessageOpen}
        selectedContact={contact}
      />
      <AddToGroupModal
        opened={isAddToGroupOpen}
        setOpened={setIsAddToGroupOpen}
        selectedContactIds={[contact.id]}
        contact={contact}
      />
    </>
  );
};

export default ContactDetailedView;
