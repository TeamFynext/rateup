import { Ban, Check, MoreVertical, RotateCcw } from "lucide-react";

import { useEditContactMutation } from "@/backend/campaign/contacts/contacts.query";
import {
  getRowKey,
  type ResolutionResult,
} from "@/backend/whatsapp/inbox/message/wamessage.api.ts";
import { useBlockWhatsAppUser } from "@/backend/whatsapp/inbox/message/wamessage.query";
import type { ContactWithUpdatedAt } from "@/components/dashboard/inbox/store.ts";
import { useContactsStore, useMessagesStore } from "@/components/dashboard/inbox/store.ts";
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
import { WaMessageAssignStatus } from "@/types/enums.ts";
import { isInboxSessionExpired } from "@/utils/whatsapp/inbox.ts";

import { getContactClosedIcon } from "../../chatselect/chatselectCard/index.tsx";
import { generateInternalMessageId } from "../../util.tsx";
import { isTicketClosed, resolutionResultLabel } from "./ticket.ts";

/**
 * The original status actions. These write the inbox status directly and carry no
 * resolution result — `applyStatus` still accepts one so the close-with-result
 * taxonomy can be reintroduced without reworking the mutation.
 */
const CLOSE_STATUSES: { status: WaMessageAssignStatus; label: string; tooltip?: string }[] = [
  { status: WaMessageAssignStatus.RESOLVED, label: "Mark as Resolved" },
  { status: WaMessageAssignStatus.CLOSED, label: "Mark as Closed" },
  { status: WaMessageAssignStatus.SPAM, label: "Mark as Spam" },
  {
    status: WaMessageAssignStatus.UNRESOLVED,
    label: "Mark as Unresolved",
    tooltip: "All the assignees will be removed as closed,resolved and spam",
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
 */
export default function CloseTicketMenu({ contact }: Readonly<CloseTicketMenuProps>) {
  const editContactMutation = useEditContactMutation(null);
  const messagesStore = useMessagesStore();
  const { user } = useUser();
  const { updateContactById, setSelectedContact } = useContactsStore();
  const confirm = useConfirm();
  const blockmut = useBlockWhatsAppUser();

  const closed = isTicketClosed(contact);
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
    const id = generateInternalMessageId();
    const newMessage = {
      id: id,
      contactId: contact.id,
      waCreatedAt: new Date().toISOString(),
      messageBody: {
        send: null,
        receive: null,
        internal: {
          text: { body: message },
          assignedUsers: [],
          assignStatus: status,
          triggeredByUser: {
            id: user.userId,
            name: user.userName,
          },
        },
        exchangeProcess: "internal",
      },
      sourcePlatform: "INTERNAL",
      sourceIdentifier: null,
      sendBy: user.userId,
      sender: {
        name: user.userName,
        profilePhoto: user?.profilePhoto,
      },
      stats: { read: "", sent: "", failed: "", delivered: "" },
      messageId: id,
    };
    const rowKey = getRowKey(contact);
    messagesStore.addMessage(`${rowKey}_all`, newMessage as any);
    messagesStore.addMessage(`${rowKey}_internal`, newMessage as any);

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
            closedUser: closed ? null : { name: user?.userName, id: user.userId },
            assignedUsers: [],
          }));
        },
        onError: () => {
          messagesStore.removeMessage(`${rowKey}_all`, id);
          messagesStore.removeMessage(`${rowKey}_internal`, id);
        },
      },
    );
  }

  const overflow = canBlock ? (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="size-8" aria-label="More actions" />}
      >
        <MoreVertical className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleBlock} className="text-destructive">
            <Ban className="size-4 text-destructive" />
            Block contact
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  if (closed) {
    return (
      <>
        <Button
          size="sm"
          className="h-8 shrink-0 gap-1.5 border-transparent bg-primary text-primary-foreground shadow-none"
          disabled={editContactMutation.isPending}
          onClick={() => applyStatus(WaMessageAssignStatus.NEW, null)}
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
              carry no resolution result — "Mark as Spam" and "Mark as Unresolved"
              are only reachable here. */}
          {/* Base UI requires menu items — and especially labels — to sit inside a
              group; a bare DropdownMenuLabel throws "MenuGroupContext is missing". */}
          <DropdownMenuGroup>
            {CLOSE_STATUSES.map(({ status, label, tooltip }) => {
              const closedStatusIcon = getContactClosedIcon(status);
              const Icon = closedStatusIcon.icon;
              return (
                <DropdownMenuItem
                  key={status}
                  disabled={
                    editContactMutation.isPending || contact?.waMessageAssignStatus === status
                  }
                  onClick={() => applyStatus(status, null)}
                >
                  <Icon className={closedStatusIcon.color} />
                  {tooltip ? (
                    <CustomTooltip trigger={<p>{label}</p>} content={<p>{tooltip}</p>} />
                  ) : (
                    label
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>

          {canBlock && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                  <Ban className="size-4 text-destructive" />
                  Block contact
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
