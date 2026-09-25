import {
  IconAt,
  IconHash,
  IconRosetteDiscountCheck,
  IconShieldExclamation,
  IconStar,
  IconUserPlus,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useAssignInboxToUer,
  useToggleFavorite,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { whatsappKeys } from "@/backend/whatsapp/whatsapp.keys";
import { pressable } from "@/components/common/pressable.ts";
import { resolveChannel } from "@/components/input/channelOptions.ts";
import { StageDot } from "@/components/pipeline/shared/atoms.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import type { OptimisticMessage } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter/index.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import { useInboxViewStore } from "@/store/inbox-view.store.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import useContactStore, { useContactsStore, useMessagesStore } from "@/store/inbox.store.ts";
import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums.ts";
import type { WaInboxMessage, WaInternalMessageBody } from "@/types/global";
import { INBOX_BULK_SELECTION_LIMIT } from "@/utils/constants.ts";
import {
  formatDateWithRelativeTime,
  formatToRelativeTime,
  isWithinLastDay,
} from "@/utils/dateTime.ts";
import {
  getContactChannelSource,
  getContactDisplayPhone,
  getVisibleUnreadCount,
  isInboxSessionExpired,
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "@/utils/whatsapp/inbox.ts";

import {
  deriveStatus,
  isTicketClosed,
  STATUS_PILL_BASE,
} from "../../chatdisplay/chatdisplayHeader/ticket.ts";
import { generateInternalMessageId, getSoucePlatformIconAndColor } from "../../util.tsx";

interface WaInboxChatSelectCardProps {
  contact: ContactWithUpdatedAt;
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
  waSettings,
  lifeCycleLabels,
  isSelectionMode,
  selectedChats,
  setSelectedChats,
}: Readonly<WaInboxChatSelectCardProps>) {
  const lastMessage = contact?.lastMessage;
  const { t: translations } = useTranslation();
  const { user } = useUser();
  const qc = useQueryClient();

  const { setSelectedContact, selectedContact, updateContactById } = useContactsStore();
  const messagesStore = useMessagesStore();
  const { filterData } = useContactStore();

  const rowKey = contact ? getRowKey(contact) : "";
  const isSelected = !!selectedContact && getRowKey(selectedContact) === rowKey;

  const { platform, identifier: channelIdentifier } = getContactChannelSource(contact);
  /**
   * Which of the org's numbers/accounts this ticket came in on. Always shown when
   * the ticket has one: two earlier attempts to hide it as "redundant" on
   * single-channel orgs each just made the chip vanish somewhere it was wanted,
   * and a label that is always present is one an org can actually rely on
   * reading. It disappears on its own for tickets with no channel to name —
   * webchat and internal-only threads.
   */
  const channel = useMemo(
    () => resolveChannel(waSettings, platform, channelIdentifier),
    [waSettings, platform, channelIdentifier],
  );
  const lifecycleInfo = useMemo(() => {
    const label = lifeCycleLabels?.find((label) => label.id === contact?.lifecycleId);
    return label;
  }, [contact?.lifecycleId, lifeCycleLabels]);

  const displayName =
    contact?.name ||
    contact?.whatsappUserName ||
    getContactDisplayPhone(contact) ||
    contact?.igsId ||
    contact?.psid ||
    "Unknown";

  const compact = useInboxViewStore((s) => s.compact);

  const status = deriveStatus(contact);
  const isClosed = isTicketClosed(contact);
  const isUnassigned = !isClosed && !contact?.assignedUsers?.length;
  // The design's `fresh`: an open ticket whose newest message landed in the last
  // 24h. Only fresh rows are highlighted — an unassigned one gets the cream fill,
  // warm edge and a filled "Unassigned" badge, an assigned one an outlined "New"
  // badge. Older rows, unassigned or not, say what they are through the status
  // chip alone; a queue where every unclaimed ticket is cream has no highlight.
  // Same 24h rule as the app's `isFreshlyNew` in `ChatBox`.
  const isFresh =
    !isClosed &&
    !contact?.isSpam &&
    isWithinLastDay(lastMessage?.waCreatedAt || contact?.conversationLastMessageAt);
  const isFreshUnassigned = isFresh && isUnassigned;
  const isFreshAssigned = isFresh && !isUnassigned;
  const unreadCount = getVisibleUnreadCount(contact, user?.userId);
  const primaryAssignee = contact?.assignedUsers?.[0];

  const { mutate: toggleFavorite } = useToggleFavorite();
  const assignMut = useAssignInboxToUer(contact?.id, filterData ?? "");

  const isChecked = selectedChats.includes(rowKey);

  /**
   * Select or deselect this row — a *set* to `next`, never a flip.
   *
   * Two things can act on one click: the row, and the checkbox whose
   * `onCheckedChange` also fires when the row's click flips its `checked` prop.
   * A flip would then undo itself, and the previous `[...prev, rowKey]` appended
   * the same key twice, which is what showed "2 selected" for one card. Setting
   * an explicit value off a deduped list makes both paths agree no matter how
   * many of them run.
   */
  function setRowSelected(next: boolean) {
    if (next && !isChecked && selectedChats.length >= INBOX_BULK_SELECTION_LIMIT) {
      toast.error(`You can select up to ${INBOX_BULK_SELECTION_LIMIT} chats at a time`, {
        id: "bulk-selection-limit",
      });
      return;
    }
    setSelectedChats((prev) => {
      const without = prev.filter((id) => id !== rowKey);
      return next ? [...without, rowKey] : without;
    });
  }

  function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    toggleFavorite({ conversationId: rowKey, isFavorite: !contact?.isFavorite });
  }

  function handleAssignToMe(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      toast.error("Your account details haven't loaded yet.");
      return;
    }
    const contactId = contact.id;
    const messageId = generateInternalMessageId();
    const internalMessage: OptimisticMessage = {
      id: messageId,
      contactId,
      waCreatedAt: new Date().toISOString(),
      messageBody: {
        send: undefined as WaInboxMessage["send"],
        receive: undefined as WaInboxMessage["receive"],
        internal: {
          text: { body: `Chat assigned to ${user.userName}` },
          assignedUsers: [] as WaInternalMessageBody["assignedUsers"],
          assignStatus: WaMessageAssignStatus.ASSIGNED,
          triggeredByUser: { id: user.userId, name: user.userName },
        },
        exchangeProcess: "internal",
      },
      sourcePlatform: "INTERNAL",
      sourceIdentifier: null as string | null,
      sendBy: user.userId,
      sender: { name: user.userName, profilePhoto: user?.profilePhoto },
      stats: { read: "", sent: "", failed: "", delivered: "" },
      messageId,
    };
    messagesStore.addMessage(`${rowKey}_all`, internalMessage);
    messagesStore.addMessage(`${rowKey}_internal`, internalMessage);
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
          qc.invalidateQueries({ queryKey: whatsappKeys.messagesByContact(contactId) });
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
      {...pressable(() => {
        if (isSelectionMode) {
          // Selection is keyed by ticket (`rowKey`), like the list itself and
          // "select all" — keying it by contact would tick every row of a contact
          // who has several, and hand bulk actions an id that names no one row.
          setRowSelected(!isChecked);
          return;
        }
        // Selecting the row is all it takes to open the thread — stacked layouts
        // swap panes off the selection itself.
        setSelectedContact(contact);
      })}
      className={cn(
        "group box-border flex max-w-full cursor-pointer gap-2.75 border-b border-l-[3px] border-b-border px-4 py-3.25 transition-colors",
        isSelected
          ? "border-l-primary bg-primary/10 hover:bg-primary/10"
          : isFreshUnassigned
            ? // `--bg-warm-soft` + `--warm-700` — the same values as the app's
              // `newRowBg` and New edge, light and dark.
              "border-l-ru-amber-700 bg-ru-amber-50 hover:bg-ru-amber-100/60 dark:border-l-ru-amber-300 dark:bg-ru-amber-500/11 dark:hover:bg-ru-amber-500/16"
            : "border-l-transparent hover:bg-muted",
      )}
    >
      {isSelectionMode && (
        <Checkbox
          className="mt-1 shrink-0 border border-muted-foreground shadow-sm"
          onClick={(e) => e.stopPropagation()}
          checked={isChecked}
          onCheckedChange={(checked) => setRowSelected(Boolean(checked))}
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
              <IconStar
                className="size-3 text-amber-500"
                fill={contact?.isFavorite ? "currentColor" : "none"}
              />
            </button>
            <span
              className={cn(
                "truncate text-sm",
                isFresh ? "font-extrabold text-foreground" : "font-semibold text-foreground/85",
              )}
            >
              {displayName}
            </span>
            {contact?.isIgVerifiedUser && (
              <IconRosetteDiscountCheck className="size-3 shrink-0 text-primary" />
            )}
            {(isFreshUnassigned || isFreshAssigned) && (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-0.75 rounded-full border px-1.5 py-px text-[9px] font-extrabold tracking-[0.04em] uppercase",
                  isFreshUnassigned
                    ? "border-ru-amber-700 bg-ru-amber-700 text-white dark:border-ru-amber-300 dark:bg-ru-amber-300 dark:text-black"
                    : "border-primary/30 bg-transparent text-primary",
                )}
              >
                {isFreshUnassigned && <span className="size-1 rounded-full bg-current" />}
                {translations(isFreshUnassigned ? "Unassigned" : "New")}
              </span>
            )}
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

        {/* Last message snippet — like the chip row, dropped by the compact list,
            which keeps name, time, code + subject and the right rail only. */}
        <div
          className={cn(
            "mt-0.5 truncate pr-2 text-xs",
            unreadCount > 0 ? "text-foreground" : "text-muted-foreground",
            compact && "hidden",
          )}
        >
          {lastMessage &&
            (lastMessage.deletedAt ? (
              <span className="italic">{translations("This message was deleted")}</span>
            ) : (
              returnMessageContentBasedOnParsedMessage(
                parseWaMessage(lastMessage),
                lastMessage.messageBody.exchangeProcess,
              )
            ))}
        </div>

        {/* Chip row */}
        <div className={cn("mt-1.75 flex flex-wrap items-center gap-1.5", compact && "hidden")}>
          {/* Spam is a contact flag, so it outranks the ticket's own status pill —
              in the Spam tab the row IS the contact, not one of their tickets. */}
          {contact?.isSpam && (
            <span className={cn(STATUS_PILL_BASE, "bg-destructive text-destructive ")}>
              <IconShieldExclamation className="size-2.75" />
              {translations("Spam")}
            </span>
          )}
          {isClosed ? (
            <CustomTooltip
              trigger={
                <span className={cn(STATUS_PILL_BASE, status.className)}>
                  <span className="size-1.25 rounded-full bg-current" />
                  {translations(status.label)}
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
            <span className={cn(STATUS_PILL_BASE, status.className)}>
              <span className="size-1.25 rounded-full bg-current" />
              {translations(status.label)}
            </span>
          )}

          {/* Which number/account the ticket came in on. */}
          {channel && (
            <CustomTooltip
              trigger={
                <span
                  className={cn(
                    "inline-flex max-w-36 items-center gap-1 rounded-full border px-2 py-px text-[10px] font-bold text-muted-foreground",
                    // A number the org no longer has connected reads as dashed, so
                    // it is tellable from a live channel without opening the row.
                    channel.isConnected
                      ? "border-border"
                      : "border-dashed border-muted-foreground/50",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      getSoucePlatformIconAndColor(platform)?.bgColor,
                    )}
                  />
                  <span className="truncate">{channel.label}</span>
                </span>
              }
              content={
                <span>
                  {translations("Received on")}
                  {""}
                  {[channel.label, channel.account].filter(Boolean).join(" ·")}
                  {!channel.isConnected && ` (${translations("no longer connected")})`}
                </span>
              }
            />
          )}

          {(contact?.mentionCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-0.75 text-[10px] font-extrabold text-primary">
              <IconAt className="size-2.75" />
              {translations("Mention")}
              {(contact.mentionCount ?? 0) > 1 ? ` ${contact.mentionCount}` : ""}
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

          {/* Conversation tags read as outlined `#` chips so they are told apart
              from the filled contact-label chips above at a glance. */}
          {contact?.conversationTags?.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-0.5 rounded-full border px-2 py-px text-[10px] font-bold"
              style={{ color: tag.color ?? undefined, borderColor: tag.color ?? undefined }}
            >
              <IconHash className="size-2.25" />
              {tag.name}
            </span>
          ))}

          {/* The board column, which has replaced the lifecycle chip — the panel
              beside this list already shows the stage, and the two disagreeing on
              the same screen was the confusing part. Falls back to the lifecycle
              for contacts with no lead, so a row never loses its chip before the
              board reaches it. */}
          {contact?.stageName ? (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground">
              <StageDot color={contact.stageColor ?? null} className="size-1.5" />
              {contact.stageName}
            </span>
          ) : (
            lifecycleInfo && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground">
                {lifecycleInfo?.emoji + " " + lifecycleInfo?.name}
              </span>
            )
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
                <span className="flex size-5.5 items-center justify-center rounded-full text-[9px] font-extrabold text-primary-foreground bg-primary">
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
                <IconUserPlus className="size-3 text-primary" />
              </button>
            }
            content={<span>{translations("Assign to me")}</span>}
          />
        )}
      </div>
    </div>
  );
}
