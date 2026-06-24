import type { IndicatorProps } from "@mantine/core";
import { ActionIcon, CopyButton, Tooltip } from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import type { EmojiClickData } from "emoji-picker-react";
import {
  AlertCircle,
  Archive,
  Check,
  CheckCheck,
  CheckCircle2,
  Circle,
  CircleAlertIcon,
  Clock,
  Lock,
  Terminal,
  UserCog,
} from "lucide-react";
import React from "react";
import { toast } from "sonner";

import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { useSendNewWaMessage } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useContactsStore } from "@/components/dashboard/inbox/store.ts";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { usePhoneIdStore } from "@/components/whatsapp/inbox/chatselect/accountSelectorStore.ts";
import { PopoverEmojiPicker } from "@/components/whatsapp/templates/Details/TextFormateToolBar.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums.ts";
import type { WaReceiveMessageBody } from "@/types/global";
import { formatDateWithRelativeTime, formatToCustomTime } from "@/utils/dateTime.ts";

interface Props {
  exchangeProcess: "send" | "receive" | "internal" | "privateNote";
  messageObject: WaGetMessagesBody;
  children: React.ReactNode;
  forPreview?: boolean;
  reaction?: {
    emoji?: string;
    pos: IndicatorProps["position"];
    reaction?: string;
    from?: string;
    reactedAt?: string;
  };
}

const TIMESTAMP_CLASS = "text-[10px] font-medium text-slate-400 dark:text-slate-500";

const SEND_BACKGROUND_CLASS: Record<string, string> = {
  [MessagePlatform.INSTAGRAM]: "bg-pink-50 dark:bg-pink-950/20",
  [MessagePlatform.FACEBOOK]: "bg-blue-50 dark:bg-blue-950/20",
  [MessagePlatform.WHATSAPP]: "bg-emerald-50 dark:bg-emerald-950/20",
};

const SEND_BORDER_CLASS: Record<string, string> = {
  [MessagePlatform.INSTAGRAM]:
    "rounded-xl rounded-tr-sm border border-pink-100 dark:border-pink-900/30",
  [MessagePlatform.FACEBOOK]:
    "rounded-xl rounded-tr-sm border border-blue-100 dark:border-blue-900/30",
  [MessagePlatform.WHATSAPP]:
    "rounded-xl rounded-tr-sm border border-emerald-100 dark:border-emerald-900/30",
};

const INTERNAL_BACKGROUND_CLASS: Record<string, string> = {
  [WaMessageAssignStatus.RESOLVED]: "bg-green-50 dark:bg-green-950/20",
  [WaMessageAssignStatus.UNRESOLVED]: "bg-orange-50 dark:bg-orange-950/20",
  [WaMessageAssignStatus.CLOSED]: "bg-blue-50 dark:bg-blue-950/20",
  [WaMessageAssignStatus.SPAM]: "bg-red-50 dark:bg-red-950/20",
};

const INTERNAL_BORDER_CLASS: Record<string, string> = {
  [WaMessageAssignStatus.RESOLVED]: "rounded-xl border border-green-200 dark:border-green-900/30",
  [WaMessageAssignStatus.UNRESOLVED]:
    "rounded-xl border border-orange-200 dark:border-orange-900/30",
  [WaMessageAssignStatus.CLOSED]: "rounded-xl border border-blue-200 dark:border-blue-900/30",
  [WaMessageAssignStatus.SPAM]: "rounded-xl border border-red-200 dark:border-red-900/30",
};

const MessageStats = ({ status }: Readonly<{ status: WaGetMessagesBody["stats"] }>) => {
  if (status?.failed?.length) return null;

  return (
    <div className="flex min-w-36 flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
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

function getLatestStatusIcon(statusObj?: { [key: string]: string }) {
  if (statusObj?.read) {
    return <CheckCheck className="h-3.5 w-3.5 text-primary" />;
  }

  if (statusObj?.delivered) {
    return <CheckCheck className="h-3.5 w-3.5 text-slate-400" />;
  }

  if (statusObj?.failed) {
    return <CircleAlertIcon className="h-3.5 w-3.5 text-red-500" />;
  }

  if (statusObj?.sent) {
    return <Check className="h-3.5 w-3.5 text-slate-400" />;
  }

  return <Clock className="h-3.5 w-3.5 text-slate-400" />;
}

function getBubbleBackgroundClass(
  exchangeProcess: Props["exchangeProcess"],
  sourcePlatform: MessagePlatform | undefined,
  assignStatus: string | undefined,
  isAutomatedSend: boolean,
) {
  if (exchangeProcess === "send") {
    return isAutomatedSend
      ? "bg-primary/5 dark:bg-primary/10"
      : (sourcePlatform && SEND_BACKGROUND_CLASS[sourcePlatform]) ||
          "bg-cyan-50 dark:bg-cyan-950/20";
  }

  if (exchangeProcess === "internal") {
    return (
      (assignStatus && INTERNAL_BACKGROUND_CLASS[assignStatus]) ||
      "bg-indigo-50 dark:bg-indigo-950/20"
    );
  }

  if (exchangeProcess === "privateNote") {
    return "bg-amber-50 dark:bg-amber-950/20";
  }

  return "bg-white dark:bg-slate-900";
}

function getBubbleBorderClass(
  exchangeProcess: Props["exchangeProcess"],
  sourcePlatform: MessagePlatform | undefined,
  assignStatus: string | undefined,
  isAutomatedSend: boolean,
) {
  if (exchangeProcess === "send") {
    return isAutomatedSend
      ? "rounded-xl rounded-tr-sm border border-primary/10 dark:border-primary/20"
      : (sourcePlatform && SEND_BORDER_CLASS[sourcePlatform]) ||
          "rounded-xl rounded-tr-sm border border-cyan-100 dark:border-cyan-900/30";
  }

  if (exchangeProcess === "internal") {
    return (
      (assignStatus && INTERNAL_BORDER_CLASS[assignStatus]) ||
      "rounded-xl border border-indigo-200 dark:border-indigo-900/30"
    );
  }

  if (exchangeProcess === "privateNote") {
    return "rounded-xl rounded-tr-sm border border-amber-200 dark:border-amber-900/30";
  }

  return "rounded-xl rounded-tl-sm border border-slate-100 dark:border-slate-800";
}

function getRootAlignment(exchangeProcess: Props["exchangeProcess"]) {
  if (exchangeProcess === "internal") {
    return "justify-center";
  }

  if (exchangeProcess === "send" || exchangeProcess === "privateNote") {
    return "justify-end";
  }

  return "justify-start";
}

function getMetaAlignment(exchangeProcess: Props["exchangeProcess"]) {
  if (exchangeProcess === "send" || exchangeProcess === "privateNote") {
    return "justify-end";
  }

  if (exchangeProcess === "internal") {
    return "justify-center";
  }

  return "justify-start";
}

function renderInternalStatus(assignStatus?: string) {
  if (assignStatus === WaMessageAssignStatus.ASSIGNED) {
    return (
      <div className="flex items-center gap-1 text-indigo-600">
        <UserCog className="h-4 w-4" />
        <span>Assigned</span>
      </div>
    );
  }

  if (assignStatus === "REASSIGNED") {
    return (
      <div className="flex items-center gap-1 text-indigo-600">
        <UserCog className="h-4 w-4" />
        <span>Reassigned</span>
      </div>
    );
  }

  if (assignStatus === WaMessageAssignStatus.RESOLVED) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>Resolved</span>
      </div>
    );
  }

  if (assignStatus === WaMessageAssignStatus.CLOSED) {
    return (
      <div className="flex items-center gap-1 text-blue-600">
        <Archive className="h-4 w-4" />
        <span>Closed</span>
      </div>
    );
  }

  if (assignStatus === WaMessageAssignStatus.UNRESOLVED) {
    return (
      <div className="flex items-center gap-1 text-orange-600">
        <Circle className="h-4 w-4" />
        <span>Unresolved</span>
      </div>
    );
  }

  if (assignStatus === WaMessageAssignStatus.SPAM) {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span>Spam</span>
      </div>
    );
  }

  if (assignStatus === WaMessageAssignStatus.UNASSIGNED) {
    return (
      <div className="flex items-center gap-1 text-indigo-600">
        <UserCog className="h-4 w-4" />
        <span>Unassigned</span>
      </div>
    );
  }

  return null;
}

export const getColorForUser = (userName = "") => {
  const colors = [
    "#1E90FF", // Blue
    "#32CD32", // Green
    "#FF4500", // Red
    "#8A2BE2", // Purple
    "#20B2AA", // Teal
    "#FFA500", // Orange
    "#00CED1", // Cyan
    "#FF69B4", // Pink
    "#FFD700", // Yellow
    "#4B0082", // Indigo
  ];
  // Create a simple hash from the user's name (or other identifier)
  let hash = 0;
  for (let i = 0; i < userName.length; i++) {
    hash = (userName.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }
  // Map the hash to a color
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};
export default function WaInboxSingleMessageLayout(props: Readonly<Props>) {
  const { exchangeProcess, messageObject, reaction } = props;
  const { user } = useUser();
  const { selectedContact } = useContactsStore();
  const currentUser = selectedContact.assignedUsers?.find((c) => c.id === user?.userId);

  const { whatsappSettingsPhoneId } = usePhoneIdStore();
  const messageContentRef = React.useRef<HTMLDivElement | null>(null);
  const platform = selectedContact?.lastMessage?.sourcePlatform || MessagePlatform.WHATSAPP;
  const isAutomatedSend = exchangeProcess === "send" && !messageObject?.sender;
  const shouldShowSenderAvatar = exchangeProcess === "send" && Boolean(messageObject?.sender);
  const senderName = messageObject?.sender?.name ?? "Automation";
  const senderColor = messageObject?.sender
    ? getColorForUser(messageObject.sender.name)
    : "#3B82F6";
  const assignStatus = messageObject?.messageBody?.internal?.assignStatus;
  const rootAlignment = getRootAlignment(exchangeProcess);
  const metaAlignment = getMetaAlignment(exchangeProcess);
  const bubbleBackgroundClass = getBubbleBackgroundClass(
    exchangeProcess,
    messageObject.sourcePlatform,
    assignStatus,
    isAutomatedSend,
  );
  const bubbleBorderClass = getBubbleBorderClass(
    exchangeProcess,
    messageObject.sourcePlatform,
    assignStatus,
    isAutomatedSend,
  );
  const sendnewWaMessage = useSendNewWaMessage(
    selectedContact?.id,
    currentUser?.teamId,
    whatsappSettingsPhoneId,
    platform,
  );

  function sendReaction(emoji: string, emojiData: EmojiClickData) {
    if (!whatsappSettingsPhoneId) {
      toast.error("Select a account to send the message");
      return;
    }
    let reactionText;
    if (platform === MessagePlatform.INSTAGRAM || platform === MessagePlatform.FACEBOOK) {
      reactionText = emojiReactionMap(emojiData.unified);
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
  const timestampNode = <span className={TIMESTAMP_CLASS}>{timestamp}</span>;

  return (
    <div key={messageObject.id} className={`group flex w-full items-end gap-2 ${rootAlignment}`}>
      {exchangeProcess === "send" && (
        <div className="pointer-events-none mt-auto opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <CopyButton value={messageContentRef?.current?.innerText ?? ""}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="right">
                <ActionIcon
                  color={copied ? "teal" : "gray"}
                  variant="subtle"
                  onClick={copy}
                  className="mt-auto"
                >
                  {copied ? <Check size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </div>
      )}
      <div className="flex max-w-[min(42rem,82vw)] items-end gap-2">
        {exchangeProcess === "receive" && (
          <div className="mb-5">
            <CreativeAvatar
              name={
                selectedContact?.name ||
                selectedContact?.whatsappUserName ||
                selectedContact?.phone ||
                selectedContact?.igsId ||
                selectedContact?.psid
              }
              size="xs"
              src={selectedContact?.profilePic}
              showRing={true}
              variant="light-blue"
            />
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="min-w-0">
            {exchangeProcess === "privateNote" && (
              <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">
                <Lock className="w-3 h-3" /> Private Note
              </span>
            )}
            <div
              className={`relative overflow-hidden p-3 shadow-sm ${bubbleBackgroundClass} ${bubbleBorderClass}`}
            >
              {exchangeProcess === "send" &&
                (isAutomatedSend ? (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-xs bg-primary px-1.5 py-1 text-white shadow-sm">
                      <Terminal className="h-3 w-3" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                      Automation
                    </span>
                  </div>
                ) : (
                  <span style={{ color: senderColor }} className="mb-1 block text-xs font-semibold">
                    {senderName}
                  </span>
                ))}
              {exchangeProcess === "privateNote" && (
                <span
                  style={{ color: senderColor }}
                  className="mb-1 flex items-center gap-1 text-xs font-semibold"
                >
                  {senderName}
                </span>
              )}

              {exchangeProcess === "internal" && (
                <span className="mb-1 block text-sm">{renderInternalStatus(assignStatus)}</span>
              )}
              <div
                ref={messageContentRef}
                className="min-w-0 text-sm leading-relaxed text-slate-800 dark:text-slate-200"
              >
                {props?.children}
              </div>
              <div
                className={`absolute ${exchangeProcess === "send" ? "-bottom-1.5 right-0" : "-bottom-3 right-2"}`}
              >
                <ReactionPopOver reaction={reaction} />
              </div>
            </div>
            <div className={`mt-1 flex items-center gap-1.5 px-2 ${metaAlignment}`}>
              {!messageObject?.stats?.failed &&
              (exchangeProcess === "send" || exchangeProcess === "privateNote") ? (
                <CustomTooltip
                  trigger={timestampNode}
                  content={<MessageStats status={messageObject?.stats} />}
                  side="bottom"
                />
              ) : (
                timestampNode
              )}
              {exchangeProcess === "send" && messageObject.stats && (
                <div>{getLatestStatusIcon(messageObject?.stats)}</div>
              )}
            </div>
          </div>
          {shouldShowSenderAvatar && (
            <div className="mb-5">
              <CreativeAvatar
                name={messageObject?.sender?.name}
                size="xs"
                src={messageObject?.sender?.profilePhoto}
                showRing={true}
              />
            </div>
          )}
        </div>
      </div>

      {exchangeProcess === "receive" && (
        <div className="pointer-events-none flex items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <PopoverEmojiPicker onEmojiClick={sendReaction} />
          <CopyButton value={messageContentRef?.current?.innerText}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="right">
                <ActionIcon color={copied ? "teal" : "gray"} variant="subtle" onClick={copy}>
                  {copied ? <Check size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </div>
      )}
    </div>
  );
}

export function reactionEmojiMap(reaction) {
  if (reaction === "love") {
    return "❤";
  }

  return "�";
}

const ReactionPopOver = ({ reaction }: Readonly<{ reaction?: Props["reaction"] }>) => {
  if (!reaction) return null;
  return (
    <Popover>
      <PopoverTrigger>
        <button
          type="button"
          className="cursor-pointer rounded-full border border-slate-200 bg-white px-2 py-0.5 text-center text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          {reaction?.emoji || reactionEmojiMap(reaction?.reaction)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex items-center justify-between gap-3 rounded-xl border-slate-200 bg-white/95 shadow-lg dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex gap-1 items-center">
          <CreativeAvatar name={reaction.from} size="xs" />
          <p className="text-sm font-medium">{reaction.from}</p>
        </div>
        <p className="text-xl">{reaction?.emoji || reactionEmojiMap(reaction?.reaction)}</p>
      </PopoverContent>
    </Popover>
  );
};
