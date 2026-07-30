import { Ban, Check, MoreVertical, RotateCcw, ShieldAlert, ShieldOff } from "lucide-react";

import { useEditContactMutation } from "@/backend/campaign/contacts/contacts.query";
import {
  getRowKey,
  type ResolutionResult,
} from "@/backend/whatsapp/inbox/message/wamessage.api.ts";
import {
  useBlockWhatsAppUser,
  useReopenConversation,
  useSetContactSpam,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import type { ContactWithUpdatedAt } from "@/components/dashboard/inbox/store.ts";
import useContactStore, {
  useContactsStore,
  useMessagesStore,
} from "@/components/dashboard/inbox/store.ts";
import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { NOT_SPAM_EVENT, WaMessageAssignStatus } from "@/types/enums.ts";
import { isInboxSessionExpired } from "@/utils/whatsapp/inbox.ts";

import { getContactClosedIcon } from "../../chatselect/chatselectCard/index.tsx";
import { generateInternalMessageId } from "../../util.tsx";
import type { OptimisticMessage } from "../chatdisplayFooter/index.tsx";
import { isTicketClosed, resolutionResultLabel } from "./ticket.ts";

/**
 * The original status actions. These write the inbox status directly and carry no
 * resolution result — `applyStatus` still accepts one so the close-with-result
 * taxonomy can be reintroduced without reworking the mutation.
 */
const CLOSE_STATUSES: { status: WaMessageAssignStatus; label: string; tooltip?: string }[] = [
  { status: WaMessageAssignStatus.RESOLVED, label: "Mark as Resolved" },
  { status: WaMessageAssignStatus.CLOSED, label: "Mark as Closed" },
  {
    status: WaMessageAssignStatus.UNRESOLVED,
    label: "Mark as Unresolved",
    tooltip: "All the assignees will be removed as closed and resolved",
  },
];

interface CloseTicketMenuProps {
  contact: ContactWithUpdatedAt;
}

/**
 * The Close dropdown (the original status actions) or, once the ticket is closed,
 * the Reopen button.
 *
 * "Block contact" sits inside the Close dropdown as it originally did; the
 * overflow menu exists only for the closed state, where there is no dropdown to
 * host it — previously the whole control unmounted and block became unreachable.
 *
 * Spam sits with Block, not with the close statuses: it is a *contact* action
 * ("this person is spam"), not a way of finishing one ticket. A contact already
 * marked spam gets a "Not spam" button in place of Close/Reopen, since reopening
 * a ticket that no tab but Spam can show would be a dead end.
 */
export default function CloseTicketMenu({ contact }: Readonly<CloseTicketMenuProps>) {
  const editContactMutation = useEditContactMutation(null);
  const messagesStore = useMessagesStore();
  const { user } = useUser();
  const { updateContactById, setSelectedContact } = useContactsStore();
  const confirm = useConfirm();
  const blockmut = useBlockWhatsAppUser();
  const spamMutation = useSetContactSpam();
  const { filterData } = useContactStore();
  const reopenMutation = useReopenConversation(filterData);

  const closed = isTicketClosed(contact);
  const isSpam = !!contact?.isSpam;
  const canBlock =
    !isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp) && !contact?.blockedOnWhatsApp;

  async function handleBlock() {
    const shouldBlock = await confirm({
      title: `Block ${contact?.name ?? contact?.phone}`,
      description: "Are you sure to block this user?",
      warning: "The blocked user cannot message you and you cannot message the user",
      confirmText: "Block",
      cancelText: "Cancel",
    });

    if (!shouldBlock) return;

    blockmut.mutate(
      { phoneNumbersList: [contact.phone] },
      {
        onSuccess: () => {
          setSelectedContact({ ...contact, blockedOnWhatsApp: true });
        },
      },
    );
  }

  /**
   * Optimistically drops the system event into the thread and hands back the ids
   * needed to undo it if the request fails. Every action here writes one.
   */
  function addEventMessage(body: string, assignStatus: string) {
    const id = generateInternalMessageId();
    const newMessage: OptimisticMessage = {
      id: id,
      contactId: contact.id,
      waCreatedAt: new Date().toISOString(),
      messageBody: {
        send: null,
        receive: null,
        internal: {
          text: { body },
          assignedUsers: [],
          assignStatus,
          triggeredByUser: {
            id: user?.userId,
            name: user?.userName,
          },
        },
        exchangeProcess: "internal",
      },
      sourcePlatform: "INTERNAL",
      sourceIdentifier: null,
      sendBy: user?.userId,
      sender: {
        name: user?.userName,
        profilePhoto: user?.profilePhoto,
      },
      stats: { read: "", sent: "", failed: "", delivered: "" },
      messageId: id,
    };
    const rowKey = getRowKey(contact);
    messagesStore.addMessage(`${rowKey}_all`, newMessage as any);
    messagesStore.addMessage(`${rowKey}_internal`, newMessage as any);
    return {
      id,
      rollback: () => {
        messagesStore.removeMessage(`${rowKey}_all`, id);
        messagesStore.removeMessage(`${rowKey}_internal`, id);
      },
    };
  }

  /**
   * Mark the contact as spam, or take them back out of it.
   *
   * This is not a close: the server flags the contact and closes their open
   * tickets itself, and `useSetContactSpam` flips every row of the contact so the
   * list drops them from whichever tab is on screen.
   */
  async function handleSpam(next: boolean) {
    const who = contact?.name ?? contact?.phone;
    const confirmed = await confirm(
      next
        ? {
            title: `Mark ${who} as spam`,
            description: "Are you sure you want to mark this contact as spam?",
            warning:
              "Their open tickets will be closed and the contact will be hidden from every inbox tab except Spam.",
            confirmText: "Mark as spam",
            cancelText: "Cancel",
          }
        : {
            title: `Remove ${who} from spam`,
            description: "Are you sure this contact is not spam?",
            confirmText: "Not spam",
            cancelText: "Cancel",
          },
    );
    if (!confirmed) return;

    const { id, rollback } = addEventMessage(
      next ? "marked this contact as spam" : "marked this contact as not spam",
      next ? WaMessageAssignStatus.SPAM : NOT_SPAM_EVENT,
    );

    spamMutation.mutate(
      { contactId: contact.id, isSpam: next, messageId: id },
      { onError: rollback },
    );
  }

  /**
   * Moves the ticket between open and closed.
   *
   * `resolutionResult` is only persisted by the API when the status actually
   * changes, and only through the CONTACT endpoint — so the status and the
   * result must travel together in this one request. Never send the result on
   * its own, and never via the conversation endpoint.
   */
  function applyStatus(status: WaMessageAssignStatus, resolutionResult: ResolutionResult | null) {
    const label = resolutionResultLabel(resolutionResult);
    const message = closed
      ? "reopened this ticket"
      : label
        ? `closed this ticket as ${label}`
        : "closed this ticket";
    const { id, rollback } = addEventMessage(message, status);

    editContactMutation.mutate(
      {
        contactId: contact.id,
        data: {
          waMessageAssignStatus: status,
          resolutionResult,
          messageId: id,
        },
      },
      {
        onSuccess: () => {
          updateContactById(contact.id, (existing) => ({
            ...existing,
            waMessageAssignStatus: status,
            conversationStatus: status,
            resolutionResult,
            closedAt: closed ? null : new Date().toISOString(),
            closedUser: closed ? null : { name: user?.userName, id: user?.userId },
            assignedUsers: [],
          }));
        },
        onError: rollback,
      },
    );
  }

  /**
   * Reopen carries the ticket's assignees over: the API opens the successor
   * ticket and assigns whoever was on this one when it closed (closing revokes
   * them, so it reads the assignment history). The closed ticket keeps its own
   * record — its closedAt and resolution timings stay frozen — and the thread
   * follows the successor from the mutation's onSuccess.
   */
  function handleReopen() {
    reopenMutation.mutate({
      contactId: contact.id,
      conversationId: contact.conversationId ?? undefined,
      messageId: generateInternalMessageId(),
    });
  }

  /** The contact-level actions, shared by the Close dropdown and the overflow menu. */
  const contactActions = (
    <DropdownMenuGroup>
      {!isSpam && (
        <DropdownMenuItem onClick={() => handleSpam(true)} disabled={spamMutation.isPending}>
          <ShieldAlert className="size-4 text-muted-foreground" />
          Mark contact as spam
        </DropdownMenuItem>
      )}
      {canBlock && (
        <DropdownMenuItem onClick={handleBlock} className="text-destructive">
          <Ban className="size-4 text-destructive" />
          Block contact
        </DropdownMenuItem>
      )}
    </DropdownMenuGroup>
  );

  const overflow =
    canBlock || !isSpam ? (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="size-8" aria-label="More actions" />
          }
        >
          <MoreVertical className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{contactActions}</DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  // A spam contact has no Close/Reopen: their tickets are all closed and only the
  // Spam tab can list them, so the one action that moves them forward is "Not spam".
  if (isSpam) {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1.5"
          disabled={spamMutation.isPending}
          onClick={() => handleSpam(false)}
        >
          <ShieldOff className="size-3.5" />
          <span className="text-xs font-bold">Not spam</span>
        </Button>
        {overflow}
      </>
    );
  }

  if (closed) {
    // return <></>
    return (
      <>
        <Button
          size="sm"
          className="h-8 shrink-0 gap-1.5 border-transparent bg-primary text-primary-foreground shadow-none"
          disabled={reopenMutation.isPending}
          onClick={handleReopen}
        >
          <RotateCcw className="size-3.5" />
          <span className="text-xs font-bold">Reopen</span>
        </Button>
        {overflow}
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="sm"
              className="h-8 shrink-0 gap-1.5 border-transparent bg-green-600 text-white shadow-none"
              disabled={editContactMutation.isPending}
            />
          }
        >
          <Check className="size-3.5" />
          <span className="text-xs font-bold">Close</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* The original status actions. These set the inbox status directly and
              carry no resolution result — "Mark as Unresolved" is only reachable
              here. Spam is NOT among them: it is a contact action, below. */}
          {/* Base UI requires menu items — and especially labels — to sit inside a
              group; a bare DropdownMenuLabel throws "MenuGroupContext is missing". */}
          <DropdownMenuGroup>
            {CLOSE_STATUSES.map(({ status, label, tooltip }) => {
              const closedStatusIcon = getContactClosedIcon(status);
              const Icon = closedStatusIcon?.icon;
              return (
                <DropdownMenuItem
                  key={status}
                  disabled={
                    editContactMutation.isPending || contact?.waMessageAssignStatus === status
                  }
                  onClick={() => applyStatus(status, null)}
                >
                  <Icon className={closedStatusIcon?.color} />
                  {tooltip ? (
                    <CustomTooltip trigger={<p>{label}</p>} content={<p>{tooltip}</p>} />
                  ) : (
                    label
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          {contactActions}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
