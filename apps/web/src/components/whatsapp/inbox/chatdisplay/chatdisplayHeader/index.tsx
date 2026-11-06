import { Badge } from "@rateup/ui/components/badge";
import { Button } from "@rateup/ui/components/button";
import {
  IconArrowLeft,
  IconAt,
  IconBellOff,
  IconLayoutSidebarRight,
  IconStar,
} from "@tabler/icons-react";

import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useClearMention,
  useToggleFavorite,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import CallContactButton from "@/components/whatsapp/calling/CallContactButton.tsx";
import { cn } from "@/lib/utils.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import { useContactsStore } from "@/store/inbox.store.ts";
import { MessagePlatform } from "@/types/enums.ts";
import {
  getContactDisplayPhone,
  getContactPlatform,
  isInboxSessionExpired,
} from "@/utils/whatsapp/inbox.ts";
import { contactMessagingWindow } from "@/utils/whatsapp/messagingWindow.ts";

import { getSoucePlatformIconAndColor } from "../../util.tsx";
import CloseTicketMenu from "./CloseTicketMenu.tsx";
import ConversationHistoryStrip from "./ConversationHistoryStrip.tsx";
import WaInboxCountdownTimer from "./countDown/index.tsx";
import MetaWindowCountdown, { useMinuteClock } from "./countDown/MetaWindowCountdown.tsx";
import InstagramModerationMenu from "./InstagramModerationMenu.tsx";
import MetaAgentThreadBadge from "./MetaAgentThreadBadge.tsx";
import { deriveStatus, STATUS_PILL_BASE } from "./ticket.ts";
import TicketSubBar from "./TicketSubBar.tsx";

const CHANNEL_LABELS: Record<string, string> = {
  [MessagePlatform.WHATSAPP]: "WhatsApp",
  [MessagePlatform.INSTAGRAM]: "Instagram",
  [MessagePlatform.FACEBOOK]: "Messenger",
  [MessagePlatform.WEBCHAT]: "Webchat",
};

interface WaInboxChatDisplayHeaderProps {
  contact: ContactWithUpdatedAt;
  /**
   * Toggles the right-hand context panel where it sits inline (xl and up). The
   * panel's open state lives in `chatdisplay/index.tsx`; the toggle renders only
   * when that owner wires it through, so we never show a dead button.
   */
  onToggleContextPanel?: () => void;
  /**
   * Opens the same panel as an overlay below xl, where there is no room for a
   * third column. Separate from the inline toggle so neither needs to ask the
   * viewport what it is doing — each button is shown by CSS at its own width.
   */
  onToggleDetailsOverlay?: () => void;
}
export default function WaInboxChatDisplayHeader({
  contact,
  onToggleContextPanel,
  onToggleDetailsOverlay,
}: Readonly<WaInboxChatDisplayHeaderProps>) {
  const setSelectedContact = useContactsStore((s) => s.setSelectedContact);
  const toggleFavorite = useToggleFavorite();
  const clearMention = useClearMention();

  const platform = getContactPlatform(contact);

  const now = useMinuteClock();
  // Instagram/Messenger: up to 7 days for a person, not WhatsApp's 24 h session.
  const metaWindow = contact ? contactMessagingWindow(contact, platform, now) : null;
  const isSessionExpired = metaWindow
    ? metaWindow.state === "closed"
    : isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp);

  const sourcePlatform = getSoucePlatformIconAndColor(platform);

  const phone = getContactDisplayPhone(contact);

  const displayName =
    contact?.name ||
    contact?.whatsappUserName ||
    phone ||
    contact?.igsId ||
    contact?.psid ||
    // Known only by a WhatsApp BSUID: the id itself is meaningless to read.
    (contact?.bsuid ? "WhatsApp user" : undefined);

  const status = deriveStatus(contact);

  /**
   * "<channel> · <phone>" — the customer's side of the thread. Which of *our*
   * numbers they reached is deliberately not here: the list row and the Ticket
   * Info panel both name it, and a third copy in the header only crowds the name.
   */
  const subLine = [CHANNEL_LABELS[platform] ?? platform, phone].filter(Boolean).join(" · ");

  if (!contact) return null;
  return (
    // A container, not the viewport: the panel is resized with a handle, so
    // what fits in this row depends on its own width, not the window's.
    <div className="@container/header shrink-0 bg-background">
      {/* h-14 is the shared panel-header height (sidebar, chat list, ticket panel,
          phone preview). The divider has to live on the h-14 row itself, not on
          this wrapper: borders are inside the box, so a wrapper border would sit
          1px below every other header's line. Each row below owns its own
          border-b for the same reason. */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2.5 border-b border-border px-3 lg:px-5">
        {/* Takes its natural width first; it only truncates once the optional
            timer and status pill on the right have nothing left to give. */}
        <div className="flex min-w-0 shrink items-center gap-2.5">
          {/* Stacked layout only: dropping the selection is what brings the list
              back, which is also why this is hidden once both panes fit. */}
          <button
            onClick={() => setSelectedContact(null)}
            className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-accent lg:hidden"
            aria-label="Back to chat list"
          >
            <IconArrowLeft className="size-5" />
          </button>
          <div className="relative shrink-0">
            <CreativeAvatar
              name={displayName}
              size="md"
              isOnline={!isSessionExpired}
              showOnlineStatus={!isSessionExpired}
              onlineStatusPosition="topLeft"
              showRing={true}
              src={contact?.profilePic}
            />
            <div
              className={`absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 shadow-sm ${
                sourcePlatform?.bgColor
              }`}
            >
              {sourcePlatform?.icon}
            </div>
          </div>
          <div className="flex min-w-0 shrink flex-col justify-center">
            {/* min-w-0 down to the name, so the name truncates instead of the
                badges spilling over the buttons on the right. */}
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <h3 className="min-w-0 truncate text-sm font-extrabold leading-tight text-foreground">
                  {displayName}
                </h3>
                {!contact.consent && (
                  <CustomTooltip
                    side="bottom"
                    trigger={
                      <Badge
                        className="h-4.5 shrink-0 text-[10px] text-destructive bg-destructive/10"
                        variant={"secondary"}
                      >
                        <IconBellOff /> DND
                      </Badge>
                    }
                    content={
                      <span>This contact has not consented to receive template messages.</span>
                    }
                  />
                )}
                <MetaAgentThreadBadge contact={contact} />
              </div>
            </div>
            <p className="truncate text-[11px] leading-snug text-muted-foreground" title={subLine}>
              {subLine}
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          {/* Session timer and status pill are the least urgent items in this row
              (the status is repeated on the list row and in the details panel).
              They show whenever they fit: anything that does not wraps to a second
              line, which this one-line box clips. The status is last, so it goes
              first. Fixed width breakpoints hid them on a 15" laptop with room to
              spare. */}
          <div className="flex h-8 min-w-0 flex-1 flex-wrap content-start items-center justify-end gap-x-2 gap-y-2 overflow-hidden">
            <div className="flex h-8 items-center">
              {metaWindow ? (
                <MetaWindowCountdown win={metaWindow} now={now} />
              ) : (
                <WaInboxCountdownTimer timeStamp={contact?.lastReceivedMessageTimeStamp} />
              )}
            </div>
            <div className="flex h-8 items-center">
              <span className={cn(STATUS_PILL_BASE, "px-2.5 py-1.25 text-xs", status.className)}>
                <span className="size-1.5 rounded-full bg-current" />
                {status.label}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CustomTooltip
              side="bottom"
              content={
                <p>{contact?.isFavorite ? "Remove from favourites" : "Add to favourites"}</p>
              }
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={contact?.isFavorite ? "Remove from favourites" : "Add to favourites"}
                  aria-pressed={!!contact?.isFavorite}
                  loading={toggleFavorite.isPending}
                  onClick={() =>
                    toggleFavorite.mutate({
                      conversationId: getRowKey(contact),
                      isFavorite: !contact?.isFavorite,
                    })
                  }
                  className={cn(contact?.isFavorite && "bg-amber-50 dark:bg-amber-950/40")}
                >
                  <IconStar
                    className={cn(
                      "size-4",
                      contact?.isFavorite ? "text-amber-500" : "text-muted-foreground",
                    )}
                    fill={contact?.isFavorite ? "currentColor" : "none"}
                  />
                </Button>
              }
            />
            {(contact?.mentionCount ?? 0) > 0 && (
              <CustomTooltip
                side="bottom"
                content={<p>Clear mention</p>}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Clear mention"
                    loading={clearMention.isPending}
                    onClick={() =>
                      clearMention.mutate({
                        contactId: contact.id,
                        conversationId: contact.conversationId ?? undefined,
                      })
                    }
                    className="bg-primary/10"
                  >
                    <IconAt className="size-4 text-primary" />
                  </Button>
                }
              />
            )}
            {platform === MessagePlatform.WHATSAPP && <CallContactButton contact={contact} />}
            {platform === MessagePlatform.INSTAGRAM && (
              <InstagramModerationMenu contact={contact} />
            )}
            <CloseTicketMenu contact={contact} />
            {onToggleContextPanel && (
              <CustomTooltip
                side="bottom"
                content={<p>Toggle details panel</p>}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onToggleContextPanel}
                    aria-label="Toggle details panel"
                    className="hidden xl:inline-flex"
                  >
                    <IconLayoutSidebarRight className="size-4 text-muted-foreground" />
                  </Button>
                }
              />
            )}
            {onToggleDetailsOverlay && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onToggleDetailsOverlay}
                aria-label="Show ticket details"
                className="xl:hidden"
              >
                <IconLayoutSidebarRight className="size-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <TicketSubBar contact={contact} />
      <ConversationHistoryStrip contact={contact} />
    </div>
  );
}
