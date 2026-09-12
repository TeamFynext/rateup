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
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { cn } from "@/lib/utils.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import { useContactsStore } from "@/store/inbox.store.ts";
import { MessagePlatform } from "@/types/enums.ts";
import {
  getContactDisplayPhone,
  getContactPlatform,
  isInboxSessionExpired,
} from "@/utils/whatsapp/inbox.ts";

import { getSoucePlatformIconAndColor } from "../../util.tsx";
import CloseTicketMenu from "./CloseTicketMenu.tsx";
import ConversationHistoryStrip from "./ConversationHistoryStrip.tsx";
import WaInboxCountdownTimer from "./countDown/index.tsx";
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

  const isSessionExpired = isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp);

  const sourcePlatform = getSoucePlatformIconAndColor(platform);

  const phone = getContactDisplayPhone(contact);

  const displayName =
    contact?.name || contact?.whatsappUserName || phone || contact?.igsId || contact?.psid;

  const status = deriveStatus(contact);

  /**
   * "<channel> · <phone>" — the customer's side of the thread. Which of *our*
   * numbers they reached is deliberately not here: the list row and the Ticket
   * Info panel both name it, and a third copy in the header only crowds the name.
   */
  const subLine = [CHANNEL_LABELS[platform] ?? platform, phone].filter(Boolean).join(" · ");

  if (!contact) return null;
  return (
    <div className="shrink-0 bg-background">
      {/* h-14 is the shared panel-header height (sidebar, chat list, ticket panel,
          phone preview). The divider has to live on the h-14 row itself, not on
          this wrapper: borders are inside the box, so a wrapper border would sit
          1px below every other header's line. Each row below owns its own
          border-b for the same reason. */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2.5 border-b border-border px-3 lg:px-5">
        <div className="flex min-w-0 flex-1 shrink items-center gap-2.5">
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
          <div className="min-w-0 shrink flex flex-col justify-center">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <h3 className="truncate text-sm font-extrabold leading-tight text-foreground">
                  {displayName}
                </h3>
                {!contact.consent && (
                  <CustomTooltip
                    side="bottom"
                    trigger={
                      <Badge
                        className="w-full h-4.5 text-[10px] text-red-600 bg-red-100"
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
              </div>
            </div>
            <p className="truncate text-[11px] leading-snug text-muted-foreground" title={subLine}>
              {subLine}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CustomTooltip
            side="bottom"
            content={<p>{contact?.isFavorite ? "Remove from favourites" : "Add to favourites"}</p>}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={contact?.isFavorite ? "Remove from favourites" : "Add to favourites"}
                aria-pressed={!!contact?.isFavorite}
                disabled={toggleFavorite.isPending}
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
                  disabled={clearMention.isPending}
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
          {/* Session timer and status pill are the widest, least urgent items in
              this row — the status is repeated on the list row and in the details
              panel, so narrow widths drop them rather than squeeze the name. */}
          <span className="hidden md:contents">
            <WaInboxCountdownTimer timeStamp={contact?.lastReceivedMessageTimeStamp} />
          </span>

          <span
            className={cn(
              STATUS_PILL_BASE,
              "hidden px-2.5 py-1.25 text-xs md:inline-flex",
              status.className,
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {status.label}
          </span>

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
          {/* TODO: CHATBOT */}
          {/* {hasAIFeature && chatbot?.enableWaChat && chatbot?.enableAllWaChat && (
            <Popover>
              <PopoverTrigger asChild className="hover:bg-accent p-1 rounded-md">
                <Bot
                  className={`h-7 w-7 ${contact.aiWaChat ? "text-blue-600" : "text-gray-200"} cursor-pointer`}
                />
              </PopoverTrigger>
              <PopoverContent className="w-40 break-words">
                <p className="text-sm text-muted-foreground mb-2">
                  Enable/Disable AI response for this contact
                </p>
                <Field orientation="horizontal" className="gap-2">
                  <Switch
                    checked={contact.aiWaChat}
                    onCheckedChange={handleAiWaChat}
                    id="ai-chat-switch"
                  />
                  <FieldLabel htmlFor="ai-chat-switchh" className="text-sm">
                    AI Chat
                  </FieldLabel>
                </Field>
              </PopoverContent>
            </Popover>
          )} */}
        </div>
      </div>
      <TicketSubBar contact={contact} />
      <ConversationHistoryStrip contact={contact} />
    </div>
  );
}
