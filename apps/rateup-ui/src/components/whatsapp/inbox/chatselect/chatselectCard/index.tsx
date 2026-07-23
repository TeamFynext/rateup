import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  AtSign,
  BadgeCheck,
  CheckCircle,
  Circle,
  ShieldAlert,
  Star,
  UserPlus,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useAssignInboxToUer,
  useToggleFavorite,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useSetIsChatDisplayOpen } from "@/components/dashboard/inbox/ChatDisplayContext.tsx";
import useContactStore, {
  useContactsStore,
  useMessagesStore,
} from "@/components/dashboard/inbox/store.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums.ts";
import { WaMessageClosedStatus } from "@/utils/constants.ts";
import { formatDateWithRelativeTime, formatToRelativeTime } from "@/utils/dateTime.ts";
import {
  getContactPlatform,
  isInboxSessionExpired,
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "@/utils/whatsapp/inbox.ts";

import { STATUS_PILL_BASE } from "../../chatdisplay/chatdisplayHeader/ticket.ts";
import { generateInternalMessageId, getSoucePlatformIconAndColor } from "../../util.tsx";

/**
 * Inbox Tickets v2 — the lifecycle status shown on a row is DERIVED, never stored:
 *   closed  → the ticket is in any of the closed states (CLOSED/SPAM/RESOLVED/UNRESOLVED)
 *   assigned → somebody owns it
 *   new      → nobody owns it yet
 */
type DerivedStatus = "new" | "assigned" | "closed";

export function getDerivedStatus(contact: ContactsWithLastMessage): DerivedStatus {
  const status = (contact?.conversationStatus ??
    contact?.waMessageAssignStatus) as WaMessageAssignStatus;
  if (WaMessageClosedStatus.includes(status)) return "closed";
  return contact?.assignedUsers?.length ? "assigned" : "new";
}

const STATUS_LABEL: Record<DerivedStatus, string> = {
  new: "New",
  assigned: "Assigned",
  closed: "Closed",
};

// Tailwind bg + text for the status pill (the dot inherits via `bg-current`).
const STATUS_PILL_COLORS: Record<DerivedStatus, string> = {
  new: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
  assigned: "bg-primary/10 text-primary",
  closed: "bg-green-600/10 text-green-600",
};

interface WaInboxChatSelectCardProps {
  contact: ContactsWithLastMessage;
  waSettings: WaSettings;
  lifeCycleLabels: Array<{
    id: string;
    name: string;
    category: string;
    emoji: string;
  }>;
  isSelectionMode: boolean;
  selectedChats: string[];
  setSelectedChats: React.Dispatch<React.SetStateAction<string[]>>;
}
export default function WaInboxChatSelectCard({
  contact,
  lifeCycleLabels,
  isSelectionMode,
  selectedChats,
  setSelectedChats,
}: Readonly<WaInboxChatSelectCardProps>) {
  const lastMessage = contact?.lastMessage;
  const { t: translations } = useTranslation();
  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();
  const { user } = useUser();
  const qc = useQueryClient();

  const { setSelectedContact, selectedContact, updateContactById } = useContactsStore();
  const messagesStore = useMessagesStore();
  const { filterData } = useContactStore();

  const rowKey = contact ? getRowKey(contact) : "";
  const isSelected = !!selectedContact && getRowKey(selectedContact) === rowKey;

  const platform = getContactPlatform(contact);
  const lifecycleInfo = useMemo(() => {
    const label = lifeCycleLabels?.find((label) => label.id === contact?.lifecycleId);
    return label;
  }, [contact?.lifecycleId, lifeCycleLabels]);

  const displayName =
    contact?.name ||
    contact?.whatsappUserName ||
    contact?.phone ||
    contact?.igsId ||
    contact?.psid ||
    "Unknown";

  const status = getDerivedStatus(contact);
  const isClosed = status === "closed";
  const isUnassigned = !isClosed && !contact?.assignedUsers?.length;
  const unreadCount = contact?.unReadMessageCount ?? 0;
  const primaryAssignee = contact?.assignedUsers?.[0];

  const { mutate: toggleFavorite } = useToggleFavorite();
  const assignMut = useAssignInboxToUer(contact?.id, filterData);

  function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    toggleFavorite({ conversationId: rowKey, isFavorite: !contact?.isFavorite });
  }

  function handleAssignToMe(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      toast.error("failed!try again");
      return;
    }
    const contactId = contact.id;
    const messageId = generateInternalMessageId();
    const internalMessage = {
      id: messageId,
      contactId,
      waCreatedAt: new Date().toISOString(),
      messageBody: {
        send: null,
        receive: null,
        internal: {
          text: { body: `Chat assigned to ${user.userName}` },
          assignedUsers: [],
          assignStatus: WaMessageAssignStatus.ASSIGNED,
          triggeredByUser: { id: user.userId, name: user.userName },
        },
        exchangeProcess: "internal",
      },
      sourcePlatform: "INTERNAL",
      sourceIdentifier: null,
      sendBy: user.userId,
      sender: { name: user.userName, profilePhoto: user?.profilePhoto },
      stats: { read: "", sent: "", failed: "", delivered: "" },
      messageId,
    };
    messagesStore.addMessage(`${rowKey}_all`, internalMessage as any);
    messagesStore.addMessage(`${rowKey}_internal`, internalMessage as any);
    assignMut.mutate(
      {
        messageId,
        contactId,
        assignees: [{ userId: user.userId, teamId: user.teams?.[0] }],
      },
      {
        onSuccess: (result) => {
          // Assigning a closed ticket opens a successor rather than reviving this
          // row, so only mark this row assigned when the assignment stayed on it.
          // The refetched list brings the successor in.
          if (!result?.conversation || result.conversation.id === rowKey) {
            updateContactById(rowKey, (existing) => ({
              ...existing,
              waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
              conversationStatus: WaMessageAssignStatus.ASSIGNED,
              assignedUsers: [{ id: user.userId, name: user?.userName, teamId: user.teams?.[0] }],
            }));
          }
          qc.invalidateQueries({ queryKey: ["wa-messages", contactId] });
        },
        onError: () => {
          messagesStore.removeMessage(`${rowKey}_all`, messageId);
          messagesStore.removeMessage(`${rowKey}_internal`, messageId);
        },
      },
    );
  }

  return (
    <div
      onClick={() => {
        if (isSelectionMode) {
          setSelectedChats((prev) =>
            prev.includes(contact.id)
              ? prev.filter((id) => id !== contact.id)
              : [...prev, contact.id],
          );
          return;
        }
        setSelectedContact(contact);
        setIsChatDisplayOpen(true);
      }}
      className={cn(
        "group box-border flex max-w-full cursor-pointer gap-2.75 border-b border-l-[3px] border-b-border px-4 py-3.25 transition-colors",
        isSelected
          ? "border-l-primary bg-primary/10 hover:bg-primary/10"
          : cn(isUnassigned ? "border-l-amber-500" : "border-l-transparent", "hover:bg-muted"),
      )}
    >
      {isSelectionMode && (
        <Checkbox
          className="mt-1 shrink-0 border border-muted-foreground shadow-sm"
          onClick={(e) => e.stopPropagation()}
          checked={selectedChats.includes(contact.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedChats((prev) => [...prev, contact.id]);
            } else {
              setSelectedChats((prev) => prev.filter((id) => id !== contact.id));
            }
          }}
        />
      )}

      {/* Avatar + channel badge */}
      <div className="relative shrink-0">
        <CreativeAvatar
          name={displayName}
          size="md"
          showOnlineStatus={true}
          isOnline={!isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp)}
          onlineStatusPosition="topLeft"
          src={contact?.profilePic}
          showRing={true}
        />
        <span
          className={cn(
            "absolute bottom-0.5 -right-1 flex size-4 items-center justify-center rounded-full [&_svg]:size-2.5",
            platform === MessagePlatform.WHATSAPP
              ? "bg-green-600"
              : platform === MessagePlatform.INSTAGRAM
                ? "bg-linear-to-br from-purple-600 via-pink-500 to-orange-500"
                : platform === MessagePlatform.FACEBOOK
                  ? "bg-blue-400"
                  : "bg-blue-600",
            "border-2 border-background",
          )}
        >
          {getSoucePlatformIconAndColor(platform)?.icon}
        </span>
      </div>

      {/* Main column */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              title={contact?.isFavorite ? translations("Unstar") : translations("Star")}
              onClick={handleToggleFavorite}
              hidden={!contact?.isFavorite}
              className={cn(
                "flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none transition-opacity",
                !contact?.isFavorite && "opacity-0 group-hover:opacity-60",
              )}
            >
              <Star
                className="size-3 text-amber-500"
                fill={contact?.isFavorite ? "currentColor" : "none"}
              />
            </button>
            <span className="truncate text-sm font-bold">{displayName}</span>
            {contact?.isIgVerifiedUser && <BadgeCheck className="size-3 shrink-0 text-primary" />}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {lastMessage && formatToRelativeTime(lastMessage?.waCreatedAt, true)}
          </span>
        </div>

        {/* Ticket code + subject */}
        {(contact?.ticketNumber || contact?.ticketSubject) && (
          <div className="mt-px flex items-center gap-1.5">
            {!!contact?.ticketNumber && (
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                #{contact.ticketNumber}
              </span>
            )}
            {!!contact?.ticketSubject && (
              <span
                className="truncate text-xs font-semibold text-foreground"
                title={contact?.ticketDescription || contact.ticketSubject}
              >
                {contact.ticketSubject}
              </span>
            )}
          </div>
        )}

        {/* Last message snippet */}
        <div
          className={cn(
            "mt-0.5 truncate pr-2 text-xs",
            unreadCount > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {lastMessage &&
            returnMessageContentBasedOnParsedMessage(
              parseWaMessage(lastMessage),
              lastMessage.messageBody.exchangeProcess,
            )}
        </div>

        {/* Chip row */}
        <div className="mt-1.75 flex flex-wrap items-center gap-1.5">
          {/* Spam is a contact flag, so it outranks the ticket's own status pill —
              in the Spam tab the row IS the contact, not one of their tickets. */}
          {contact?.isSpam && (
            <span className={cn(STATUS_PILL_BASE, "bg-red-500/10 text-red-600 dark:text-red-500")}>
              <ShieldAlert className="size-2.75" />
              {translations("Spam")}
            </span>
          )}
          {isClosed ? (
            <CustomTooltip
              trigger={
                <span className={cn(STATUS_PILL_BASE, STATUS_PILL_COLORS.closed)}>
                  <span className="size-1.25 rounded-full bg-current" />
                  {translations(STATUS_LABEL.closed)}
                </span>
              }
              content={
                <span>
                  {contact.closedAt ? (
                    <span>{`Marked as ${contact?.resolutionResult ?? contact?.waMessageAssignStatus} by ${contact.closedUser?.name} at ${formatDateWithRelativeTime(contact.closedAt)}`}</span>
                  ) : (
                    translations("Closed")
                  )}
                </span>
              }
            />
          ) : (
            <span className={cn(STATUS_PILL_BASE, STATUS_PILL_COLORS[status])}>
              <span className="size-1.25 rounded-full bg-current" />
              {translations(STATUS_LABEL[status])}
            </span>
          )}

          {contact?.mentionCount > 0 && (
            <span className="inline-flex items-center gap-0.75 text-[10px] font-extrabold text-primary">
              <AtSign className="size-2.75" />
              {translations("Mention")}
              {contact.mentionCount > 1 ? ` ${contact.mentionCount}` : ""}
            </span>
          )}

          {contact?.contactLabels?.map((label) => (
            <span
              key={label.id}
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                color: label.color,
                background: `color-mix(in srgb, ${label.color} 14%, transparent)`,
              }}
            >
              {label.name}
            </span>
          ))}

          {lifecycleInfo && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground">
              {lifecycleInfo?.emoji + " " + lifecycleInfo?.name}
            </span>
          )}
        </div>
      </div>

      {/* Right rail */}
      <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
        {unreadCount > 0 && (
          <Badge className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold text-white bg-green-600">
            {unreadCount}
          </Badge>
        )}

        {primaryAssignee && (
          <CustomTooltip
            trigger={
              <span className="flex items-center">
                <span className="flex size-5.5 items-center justify-center rounded-full text-[9px] font-extrabold text-white bg-primary">
                  {primaryAssignee?.name?.charAt(0)?.toUpperCase()}
                </span>
                {contact?.assignedUsers?.length > 1 && (
                  <span className="-ml-1 flex size-5.5 items-center justify-center rounded-full text-[9px] font-extrabold bg-muted text-muted-foreground">
                    +{contact.assignedUsers.length - 1}
                  </span>
                )}
              </span>
            }
            content={
              <div>
                <p className="mb-1">{translations("Assigned Staff")}:</p>
                <div className="flex max-w-lg flex-wrap gap-1 py-2">
                  {contact?.assignedUsers?.map((assignee) => (
                    <Badge key={assignee?.id} className="h-4 p-2 text-[10px]">
                      {assignee?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            }
          />
        )}

        {isUnassigned && (
          <CustomTooltip
            trigger={
              <button
                type="button"
                onClick={handleAssignToMe}
                disabled={assignMut.isPending}
                className="flex size-5.5 cursor-pointer items-center justify-center rounded-full border-0 p-0 outline-none bg-primary/10"
              >
                <UserPlus className="size-3 text-primary" />
              </button>
            }
            content={<span>{translations("Assign to me")}</span>}
          />
        )}
      </div>
    </div>
  );
}

export function getContactClosedIcon(status) {
  switch (status) {
    case WaMessageAssignStatus.CLOSED:
      return {
        icon: Archive,
        color: "text-blue-500 dark:text-blue-600",
      };
    case WaMessageAssignStatus.RESOLVED:
      return {
        icon: CheckCircle,
        color: "text-green-500 dark:text-green-600",
      };
    case WaMessageAssignStatus.UNRESOLVED:
      return {
        icon: Circle,
        color: "text-orange-500 dark:text-orange-600",
      };
    case WaMessageAssignStatus.SPAM:
      return {
        icon: AlertCircle,
        color: "text-red-500 dark:text-red-600",
      };
  }
}
