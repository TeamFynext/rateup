"use client";

import React, { useEffect, useState } from "react";

import {
  ActionIcon,
  Avatar,
  CopyButton,
  Group,
  Indicator,
  IndicatorProps,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChecks,
  IconClock,
  IconCopy,
  IconExclamationCircleFilled,
  IconRobot,
} from "@tabler/icons-react";
import { EmojiClickData } from "emoji-picker-react";
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
  UserCog,
} from "lucide-react";

import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums";
import { WaReceiveMessageBody, WaSendMessageBody } from "@/types/global";
import useContactStore, { useContactsStore } from "@/app/dashboard/inbox/store";
import { useSendNewWaMessage } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { CreativeAvatar } from "@/components/ui/creative-avatar";
import CustomTooltip from "@/components/ui/custom/CustomTooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePhoneIdStore } from "@/components/whatsapp/inbox/chatselect/accountSelectorStore";
import { PopoverEmojiPicker } from "@/components/whatsapp/templates/Details/TextFormateToolBar";
import { useUser } from "@/context/UserContext";
import { showErrorToast } from "@/utils/notifications";

import { WaGetMessagesBody } from "../../../../../../../backend/whatsapp/inbox/message/wamessage.api";
import {
  formatDateWithRelativeTime,
  formatDateWithTime,
  formatToCustomTime,
  formatToRelativeTime,
} from "../../../../../../../utils/dateTime";
import classes from "./styles.module.css";

interface Props {
  exchangeProcess: "send" | "receive" | "internal" | "privateNote";
  messageObject: WaGetMessagesBody;
  children: any;
  forPreview?: boolean;
  reaction?: {
    emoji?: string;
    pos: IndicatorProps["position"];
    reaction?: string;
    from?: string;
    reactedAt?: string;
  };
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
    hash = userName.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Map the hash to a color
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};
export default function WaInboxSingleMessageLayout(props: Props) {
  const { exchangeProcess, messageObject, reaction } = props;
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useUser();
  const { selectedContact } = useContactsStore();
  const currentUser = selectedContact.assignedUsers?.find(
    (c) => c.id === user?.userId,
  );

  const { whatsappSettingsPhoneId } = usePhoneIdStore();
  const messageContentRef = React.useRef(null);
  const platform =
    selectedContact?.lastMessage?.sourcePlatform || MessagePlatform.WHATSAPP;
  const sendnewWaMessage = useSendNewWaMessage(
    selectedContact?.id,
    currentUser?.teamId,
    whatsappSettingsPhoneId,
    platform,
  );

  const getLatestStatus = (statusObj: { [key: string]: string }) => {
    if (statusObj?.read)
      return <CheckCheck className="w-3.5 h-3.5 text-blue-600" />;
    if (statusObj?.delivered)
      return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
    if (statusObj?.failed)
      return <CircleAlertIcon className="w-3.5 h-3.5 text-red-500" />;
    if (statusObj?.sent)
      return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
    return <Clock className="w-3.5 h-3.5 text-gray-500" />;
  };

  function emojiReactionMap(emojiUnified) {
    switch (emojiUnified) {
      case "2764-fe0f":
        return "love";
      default:
        return null;
    }
  }
  function sendReaction(emoji: string, emojiData: EmojiClickData) {
    if (!whatsappSettingsPhoneId) {
      showErrorToast("Select a account to send the message");
      return;
    }
    let reactionText;
    if (platform === MessagePlatform.INSTAGRAM) {
      reactionText = emojiReactionMap(emojiData.unified);
      if (!reactionText) {
        showErrorToast(`${emoji} not supported`);
        return;
      }
    }
    const messageId =
      platform === MessagePlatform.INSTAGRAM
        ? props?.messageObject.messageId
        : exchangeProcess === "receive"
          ? (props?.messageObject?.messageBody?.receive as WaReceiveMessageBody)
              ?.messages[0]?.id
          : props?.messageObject?.messageId;
    const reaction = {
      reaction: reactionText,
      emoji: platform === MessagePlatform.INSTAGRAM ? undefined : emoji,
      toWaMessageId: messageId,
    };
    sendnewWaMessage.mutate({ reaction, type: "reaction" });
  }

  const MessageStats = ({ status }) => {
    if (status?.failed?.length) return;
    return (
      <div className="flex flex-col text-xs gap-1">
        <p>
          Read:{" "}
          {status?.read ? formatDateWithRelativeTime(status?.read) : "..."}
        </p>
        <p>
          Delivered:{" "}
          {status?.delivered
            ? formatDateWithRelativeTime(status?.delivered)
            : "..."}
        </p>
        <p>
          Sent:{" "}
          {status?.sent ? formatDateWithRelativeTime(status?.sent) : "..."}
        </p>
      </div>
    );
  };

  const getBackgroundClass = () => {
    if (exchangeProcess === "send") {
      switch (messageObject.sourcePlatform) {
        case MessagePlatform.INSTAGRAM:
          return "bg-pink-300/10";
        case MessagePlatform.WHATSAPP:
          return "bg-green-500/10 dark:bg-green-950";
        default:
          return "bg-cyan-300";
      }
    }

    if (exchangeProcess === "internal") {
      switch (messageObject?.messageBody?.internal?.assignStatus) {
        case WaMessageAssignStatus.RESOLVED:
          return "bg-green-50";
        case WaMessageAssignStatus.UNRESOLVED:
          return "bg-orange-50";
        case WaMessageAssignStatus.CLOSED:
          return "bg-blue-50";
        case WaMessageAssignStatus.SPAM:
          return "bg-red-50";
        default:
          return "bg-indigo-50";
      }
    }
    if (exchangeProcess === "privateNote") return "bg-amber-50";

    return "bg-white dark:bg-gray-900";
  };

  const getBorderClass = () => {
    if (exchangeProcess === "send") return "rounded-br-sm";
    if (exchangeProcess === "internal") {
      switch (messageObject?.messageBody?.internal?.assignStatus) {
        case WaMessageAssignStatus.RESOLVED:
          return "border border-green-200";
        case WaMessageAssignStatus.UNRESOLVED:
          return "border border-orange-200";
        case WaMessageAssignStatus.CLOSED:
          return "border border-blue-200";
        case WaMessageAssignStatus.SPAM:
          return "border border-red-200";
        default:
          return "border border-indigo-200";
      }
    }
    if (exchangeProcess === "privateNote")
      return "border border-amber-200 rounded-br-sm";

    return "border border-border rounded-bl-sm";
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      key={messageObject.id}
      className={`flex ${
        exchangeProcess === "internal"
          ? "justify-center"
          : exchangeProcess === "send" || exchangeProcess === "privateNote"
            ? "justify-end"
            : "justify-start"
      }`}
    >
      {exchangeProcess === "send" && isHovered && (
        <CopyButton value={messageContentRef?.current?.innerText ?? ""}>
          {({ copied, copy }) => (
            <Tooltip
              label={copied ? "Copied" : "Copy"}
              withArrow
              position="right"
            >
              <ActionIcon
                color={copied ? "teal" : "gray"}
                variant="subtle"
                onClick={copy}
              >
                {copied ? <Check size={16} /> : <IconCopy size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      )}
      <div className="flex items-end space-x-2 max-w-[75%]">
        {exchangeProcess === "receive" && (
          <div className="mb-1">
            <CreativeAvatar
              name={selectedContact?.name}
              size="xs"
              src={selectedContact?.profilePic}
              showRing={true}
              variant="light-blue"
            />
          </div>
        )}
        <div className="flex gap-2">
          <div>
            {exchangeProcess === "privateNote" && (
              <span className="flex items-center gap-1 text-amber-600 text-xs">
                <Lock className="w-3 h-3" /> Private Note
              </span>
            )}
            <div
              className={`px-4 py-2.5 rounded-2xl shadow-sm relative ${getBackgroundClass()} ${getBorderClass()}`}
            >
              {exchangeProcess === "send" && (
                <span
                  style={{
                    color: !messageObject?.sender
                      ? "#3B82F6"
                      : getColorForUser(messageObject?.sender?.name),
                  }}
                  className={`text-sm`}
                >
                  {!messageObject?.sender
                    ? "Automation"
                    : messageObject?.sender?.name}
                </span>
              )}
              {exchangeProcess === "privateNote" && (
                <span
                  style={{
                    color: !messageObject?.sender
                      ? "#3B82F6"
                      : getColorForUser(messageObject?.sender?.name),
                  }}
                  className={`text-sm flex items-center gap-1`}
                >
                  {!messageObject?.sender
                    ? "Automation"
                    : messageObject?.sender?.name}
                </span>
              )}

              {exchangeProcess === "internal" && (
                <span className={`text-sm`}>
                  {messageObject?.messageBody?.internal?.assignStatus ===
                    WaMessageAssignStatus.ASSIGNED && (
                    <div className="flex items-center gap-1 text-indigo-600">
                      <UserCog className="w-4 h-4" />
                      <span>ASSIGNED</span>
                    </div>
                  )}
                  {messageObject?.messageBody?.internal?.assignStatus ===
                    "REASSIGNED" && (
                    <div className="flex items-center gap-1 text-indigo-600">
                      <UserCog className="w-4 h-4" />
                      <span>REASSIGNED</span>
                    </div>
                  )}
                  {messageObject?.messageBody?.internal?.assignStatus ===
                    WaMessageAssignStatus.RESOLVED && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>RESOLVED</span>
                    </div>
                  )}
                  {messageObject?.messageBody?.internal?.assignStatus ===
                    WaMessageAssignStatus.CLOSED && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Archive className="w-4 h-4" />
                      <span>CLOSED</span>
                    </div>
                  )}
                  {messageObject?.messageBody?.internal?.assignStatus ===
                    WaMessageAssignStatus.UNRESOLVED && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Circle className="w-4 h-4" />
                      <span>UNRESOLVED</span>
                    </div>
                  )}
                  {messageObject?.messageBody?.internal?.assignStatus ===
                    WaMessageAssignStatus.SPAM && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span>SPAM</span>
                    </div>
                  )}
                  {messageObject?.messageBody?.internal?.assignStatus ===
                    WaMessageAssignStatus.UNASSIGNED && (
                    <div className="flex items-center gap-1 text-indigo-600">
                      <UserCog className="w-4 h-4" />
                      <span>UNASSIGNED</span>
                    </div>
                  )}
                </span>
              )}
              <div ref={messageContentRef}>{props?.children}</div>
              <div
                className={`absolute ${exchangeProcess === "send" ? "-bottom-1.5 right-0" : "-bottom-3 right-2"}`}
              >
                <ReactionPopOver reaction={reaction} />
              </div>
            </div>
            <div
              className={`flex items-center space-x-2 mt-1 px-2 ${
                exchangeProcess === "send" || exchangeProcess === "privateNote"
                  ? "justify-end"
                  : exchangeProcess === "internal"
                    ? "justify-center"
                    : "justify-start"
              }`}
            >
              {!messageObject?.stats?.failed &&
              (exchangeProcess === "send" ||
                exchangeProcess === "privateNote") ? (
                <CustomTooltip
                  trigger={
                    <span className="text-xs text-muted-foreground">
                      {formatToCustomTime(messageObject?.waCreatedAt)}
                    </span>
                  }
                  content={<MessageStats status={messageObject?.stats} />}
                  side="bottom"
                />
              ) : !messageObject?.stats?.failed &&
                exchangeProcess === "receive" ? (
                <span className="text-xs text-muted-foreground">
                  {formatToCustomTime(messageObject?.waCreatedAt)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {formatToCustomTime(messageObject?.waCreatedAt)}
                </span>
              )}
              {exchangeProcess === "send" && messageObject.stats && (
                <div>{getLatestStatus(messageObject?.stats)}</div>
              )}
            </div>
          </div>
          {exchangeProcess === "send" && (
            <div className="mb-1">
              {!messageObject?.sender ? (
                <div className="rounded-xl bg-blue-500 text-white p-1">
                  <IconRobot className="w-4 h-4" />
                </div>
              ) : (
                <CreativeAvatar
                  name={messageObject?.sender?.name}
                  size="xs"
                  src={messageObject?.sender?.profilePhoto}
                  showRing={true}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {exchangeProcess === "receive" && isHovered && (
        <div className="flex gap-1 items-center">
          <PopoverEmojiPicker onEmojiClick={sendReaction} />
          <CopyButton value={messageContentRef?.current?.innerText}>
            {({ copied, copy }) => (
              <Tooltip
                label={copied ? "Copied" : "Copy"}
                withArrow
                position="right"
              >
                <ActionIcon
                  color={copied ? "teal" : "gray"}
                  variant="subtle"
                  onClick={copy}
                >
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
  switch (reaction) {
    case "love":
      return "❤";
    default:
      return "�";
  }
}

const ReactionPopOver = ({ reaction }) => {
  if (!reaction) return null;
  return (
    <Popover>
      <PopoverTrigger>
        <p className="text-center bg-gray-100 p-1 rounded-lg text-xs cursor-pointer">
          {reaction?.emoji || reactionEmojiMap(reaction?.reaction)}
        </p>
      </PopoverTrigger>
      <PopoverContent className="flex justify-between">
        <div className="flex gap-1 items-center">
          <CreativeAvatar name={reaction.from} size="xs" />
          <p className="text-sm font-medium">{reaction.from}</p>
        </div>
        <p className="text-xl">
          {reaction?.emoji || reactionEmojiMap(reaction?.reaction)}
        </p>
      </PopoverContent>
    </Popover>
  );
};
