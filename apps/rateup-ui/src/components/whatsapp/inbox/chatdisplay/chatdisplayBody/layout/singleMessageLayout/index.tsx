import {
  IconAlertCircle,
  IconArchive,
  IconCheck,
  IconChecks,
  IconCircle,
  IconCircleCheck,
  IconClock,
  IconCopy,
  IconLock,
  IconRobot,
  IconShieldOff,
  IconSparkles,
  IconSpeakerphone,
  IconUserCog,
} from "@tabler/icons-react";
import type { EmojiClickData } from "emoji-picker-react";
import React, { useState } from "react";
import { toast } from "sonner";

import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { useSendNewWaMessage } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Bubble, BubbleContent, BubbleReactions } from "@/components/ui/bubble.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ContactAvatar } from "@/components/ui/contact-avatar.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { usePhoneIdStore } from "@/components/whatsapp/inbox/chatselect/accountSelectorStore.ts";
import { PopoverEmojiPicker } from "@/components/whatsapp/templates/Details/TextFormateToolBar.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { useContactsStore } from "@/store/inbox.store.ts";
import { MessagePlatform, NOT_SPAM_EVENT, WaMessageAssignStatus } from "@/types/enums.ts";
import type { WaReceiveMessageBody } from "@/types/global";
import { formatDateWithRelativeTime, formatToCustomTime } from "@/utils/dateTime.ts";
import { getContactPlatform, isMetaAiMessage } from "@/utils/whatsapp/inbox.ts";

interface Props {
  exchangeProcess: "send" | "receive" | "internal" | "privateNote";
  messageObject: WaGetMessagesBody;
  children: React.ReactNode;
  forPreview?: boolean;
  reaction?: {
    emoji?: string;
    pos?: string;
    reaction?: string;
    from?: string;
    reactedAt?: string;
  };
}

const MessageStats = ({ status }: Readonly<{ status: WaGetMessagesBody["stats"] }>) => {
  if (status?.failed?.length) return null;

  return (
    <div className="flex min-w-36 flex-col gap-1 text-xs text-muted-foreground">
      <p>Read: {status?.read ? formatDateWithRelativeTime(status?.read) : "..."}</p>
      <p>Delivered: {status?.delivered ? formatDateWithRelativeTime(status?.delivered) : "..."}</p>
      <p>Sent: {status?.sent ? formatDateWithRelativeTime(status?.sent) : "..."}</p>
    </div>
  );
};

function emojiReactionMap(emojiUnified?: string) {
  if (emojiUnified === "2764-fe0f") {
    return "love";
  }

  return null;
}

/**
 * Delivery ticks. The footer already carries `text-muted-foreground`, so only
 * the states that need to stand out (read / failed) name a colour.
 */
function getLatestStatusIcon(statusObj?: { [key: string]: string }) {
  if (statusObj?.read) {
    return <IconChecks className="size-3.5 text-primary" />;
  }

  if (statusObj?.delivered) {
    return <IconChecks className="size-3.5" />;
  }

  if (statusObj?.failed) {
    return <IconAlertCircle className="size-3.5 text-destructive" />;
  }

  if (statusObj?.sent) {
    return <IconCheck className="size-3.5" />;
  }

  return <IconClock className="size-3.5" />;
}

/**
 * System/status messages (`exchangeProcess === "internal"`) keep the same
 * assign-status vocabulary they had before — only the chrome changed.
 */
function getInternalStatus(assignStatus?: string): { icon: React.ReactNode; label: string } | null {
  if (assignStatus === WaMessageAssignStatus.ASSIGNED) {
    return { icon: <IconUserCog />, label: "Assigned" };
  }

  if (assignStatus === "REASSIGNED") {
    return { icon: <IconUserCog />, label: "Reassigned" };
  }

  if (assignStatus === WaMessageAssignStatus.RESOLVED) {
    return { icon: <IconCircleCheck />, label: "Resolved" };
  }

  if (assignStatus === WaMessageAssignStatus.CLOSED) {
    return { icon: <IconArchive />, label: "Closed" };
  }

  if (assignStatus === WaMessageAssignStatus.UNRESOLVED) {
    return { icon: <IconCircle />, label: "Unresolved" };
  }

  if (assignStatus === WaMessageAssignStatus.SPAM) {
    return { icon: <IconAlertCircle />, label: "Spam" };
  }

  if (assignStatus === NOT_SPAM_EVENT) {
    return { icon: <IconShieldOff />, label: "Not spam" };
  }

  if (assignStatus === WaMessageAssignStatus.UNASSIGNED) {
    return { icon: <IconUserCog />, label: "Unassigned" };
  }

  return null;
}

export default function WaInboxSingleMessageLayout(props: Readonly<Props>) {
  const { exchangeProcess, messageObject, reaction } = props;
  const { user } = useUser();
  const { selectedContact } = useContactsStore();
  const currentUser = selectedContact?.assignedUsers?.find((c) => c.id === user?.userId);

  const { whatsappSettingsPhoneId } = usePhoneIdStore();
  const messageContentRef = React.useRef<HTMLDivElement | null>(null);
  const platform = getContactPlatform(selectedContact);
  const isAutomatedSend = exchangeProcess === "send" && !messageObject?.sender;
  const shouldShowSenderAvatar = exchangeProcess === "send" && Boolean(messageObject?.sender);
  const senderName = messageObject?.sender?.name ?? "Automation";
  const assignStatus = messageObject?.messageBody?.internal?.assignStatus;
  // TEMP: surfaces the raw `sourceMessage` beside each message while the
  // campaign/automation labelling is being verified.
  const sourceTag = messageObject?.sourceMessage ? (
    <span className="rounded border px-1 font-mono text-[10px] uppercase opacity-70">
      {messageObject.sourceMessage}
    </span>
  ) : null;
  const sendnewWaMessage = useSendNewWaMessage(
    selectedContact?.id,
    currentUser?.teamId,
    whatsappSettingsPhoneId,
    platform,
  );

  const [copied, setCopied] = useState(false);

  // A revoked message shows a placeholder, not its content: there is nothing
  // worth copying, and WhatsApp rejects a reaction to a message that is gone.
  const isDeleted = Boolean(messageObject?.deletedAt);

  const handleCopy = () => {
    if (!messageContentRef?.current?.innerText) return;
    navigator.clipboard.writeText(messageContentRef.current.innerText);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  function sendReaction(emoji: string, emojiData?: EmojiClickData) {
    if (!whatsappSettingsPhoneId) {
      toast.error("Select a account to send the message");
      return;
    }
    let reactionText;
    if (platform === MessagePlatform.INSTAGRAM || platform === MessagePlatform.FACEBOOK) {
      reactionText = emojiReactionMap(emojiData?.unified);
      if (!reactionText) {
        toast.error(`${emoji} not supported`);
        return;
      }
    }
    let messageId = props?.messageObject?.messageId;
    if (
      exchangeProcess === "receive" &&
      platform !== MessagePlatform.INSTAGRAM &&
      platform !== MessagePlatform.FACEBOOK
    ) {
      messageId = (props?.messageObject?.messageBody?.receive as WaReceiveMessageBody)?.messages[0]
        ?.id;
    }
    const reactionPayload = {
      reaction: reactionText,
      emoji:
        platform === MessagePlatform.INSTAGRAM || platform === MessagePlatform.FACEBOOK
          ? undefined
          : emoji,
      toWaMessageId: messageId,
    };
    sendnewWaMessage.mutate({ reaction: reactionPayload, type: "reaction" });
  }

  const timestamp = formatToCustomTime(messageObject?.waCreatedAt);
  const timestampNode = <span>{timestamp}</span>;

  /** Timestamp with the delivery-stats tooltip, unless the send failed. */
  const timestampWithStats = messageObject?.stats?.failed ? (
    timestampNode
  ) : (
    <CustomTooltip
      trigger={timestampNode}
      content={<MessageStats status={messageObject?.stats} />}
      side="bottom"
    />
  );

  const copyAction = isDeleted ? null : (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="Copy"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleCopy}
            />
          }
        >
          {copied ? <IconCheck className="size-4" /> : <IconCopy size={16} />}
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{copied ? "Copied" : "Copy"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  /* ---------------------------------------------------------------- system */
  // Assign / close / spam events: a single centered badge rather than a full-width
  // separator, so status changes read as inline events in the timeline.
  if (exchangeProcess === "internal") {
    const status = getInternalStatus(assignStatus);
    return (
      <Message align="center">
        <MessageContent className="w-auto">
          <Badge
            variant="system"
            // Layout only: the badge is normally a fixed-height chip, but this one
            // wraps a rendered message, so it needs to grow.
            className="h-auto max-w-full gap-1.5 rounded-full px-3 py-1"
          >
            {status?.icon}
            {/* <span className="font-semibold">{status?.label}</span> */}
            <span ref={messageContentRef} className="min-w-0 truncate empty:hidden">
              {props?.children}
            </span>
            <span className="opacity-70">{timestamp}</span>
          </Badge>
        </MessageContent>
      </Message>
    );
  }

  /* --------------------------------------------------------- internal note */
  // Centered and amber via the `note` Bubble variant — internal notes are not part
  // of the customer conversation, and the colour is what signals that at a glance.
  if (exchangeProcess === "privateNote") {
    return (
      <Message align="center">
        <MessageContent className="max-w-[78%]">
          <MessageHeader className="gap-1.5 text-[10px] font-extrabold tracking-wider uppercase">
            <IconLock className="size-3 shrink-0" />
            <span className="truncate">
              Internal note · {senderName} · {timestamp}
            </span>
          </MessageHeader>
          <Bubble variant="note" className="max-w-full">
            <BubbleContent ref={messageContentRef}>{props?.children}</BubbleContent>
          </Bubble>
          {messageObject?.stats && !messageObject?.stats?.failed && (
            <MessageFooter>{timestampWithStats}</MessageFooter>
          )}
        </MessageContent>
      </Message>
    );
  }

  /* ------------------------------------------------------- bot / automation */
  // Outbound like an agent reply, so it sits on the send side. It keeps the
  // `muted` bubble rather than the agent's `default` fill, so an automated reply
  // is still distinguishable from one a person wrote.
  if (isAutomatedSend) {
    // Campaign sends have no sender either, so they land here too; the API's
    // `sourceMessage` tells them apart. Compared loosely — older rows were
    // written in lowercase (see isCampaignMessage in the API worker).
    {
      JSON.stringify(messageObject?.sourceMessage);
    }
    const isCampaign = messageObject?.sourceMessage?.toLowerCase() === "campaign";
    // A reply the Meta Business Agent wrote is automated too, but it is Meta's AI
    // answering, not one of the org's own rules — worth telling apart at a glance.
    const isMetaAi = !isCampaign && isMetaAiMessage(messageObject);
    return (
      <Message align="end">
        <MessageContent>
          <MessageHeader className="gap-1">
            {isCampaign ? (
              <IconSpeakerphone className="size-3 shrink-0" />
            ) : isMetaAi ? (
              <IconSparkles className="size-3 shrink-0" />
            ) : (
              <IconRobot className="size-3 shrink-0" />
            )}
            {isCampaign ? "Campaign" : isMetaAi ? "Meta AI" : "Automation"}
          </MessageHeader>
          <Bubble variant="muted" align="end">
            <BubbleContent ref={messageContentRef}>{props?.children}</BubbleContent>
          </Bubble>
          <MessageFooter>
            {sourceTag}
            {copyAction}
            {timestampNode}
            {messageObject.stats && getLatestStatusIcon(messageObject?.stats)}
          </MessageFooter>
        </MessageContent>
      </Message>
    );
  }

  /* --------------------------------------------------------------- outgoing */
  if (exchangeProcess === "send") {
    return (
      <Message align="end">
        {shouldShowSenderAvatar && (
          <MessageAvatar>
            <CreativeAvatar
              name={messageObject?.sender?.name}
              size="xs"
              src={messageObject?.sender?.profilePhoto}
              showRing={true}
            />
          </MessageAvatar>
        )}
        <MessageContent>
          <MessageHeader>{senderName}</MessageHeader>
          <Bubble variant="default" align="end">
            <BubbleContent ref={messageContentRef}>{props?.children}</BubbleContent>
          </Bubble>
          <MessageFooter>
            {sourceTag}
            {copyAction}
            {timestampWithStats}
            {messageObject.stats && getLatestStatusIcon(messageObject?.stats)}
          </MessageFooter>
        </MessageContent>
      </Message>
    );
  }

  /* --------------------------------------------------------------- incoming */
  return (
    <Message align="start">
      <MessageAvatar>
        <ContactAvatar
          name={
            selectedContact?.name ||
            selectedContact?.whatsappUserName ||
            selectedContact?.phone ||
            selectedContact?.igsId ||
            selectedContact?.psid
          }
          size="xs"
          src={selectedContact?.profilePic}
        />
      </MessageAvatar>
      <MessageContent>
        <Bubble variant="outline" align="start">
          <BubbleContent ref={messageContentRef}>{props?.children}</BubbleContent>
          <BubbleReactions hidden={!reaction?.emoji}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon-xs">
                    {reaction?.emoji || reactionEmojiMap(reaction?.reaction)}
                  </Button>
                }
              />
              <TooltipContent>Reacted By {reaction?.from}</TooltipContent>
            </Tooltip>
          </BubbleReactions>
        </Bubble>
        <MessageFooter>
          {timestampNode}
          {!isDeleted && <PopoverEmojiPicker onEmojiClick={sendReaction} />}
          {copyAction}
          {sourceTag}
        </MessageFooter>
      </MessageContent>
    </Message>
  );
}

export function reactionEmojiMap(reaction: string | undefined) {
  if (reaction === "love") {
    return "❤";
  }

  return "";
}
