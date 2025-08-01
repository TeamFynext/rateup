import { useEffect, useState } from "react";

import {
  Avatar,
  Group,
  Indicator,
  IndicatorProps,
  Paper,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconChecks,
  IconClock,
  IconExclamationCircleFilled,
} from "@tabler/icons-react";
import { EmojiClickData } from "emoji-picker-react";

import { MessagePlatform } from "@/types/enums";
import { WaReceiveMessageBody, WaSendMessageBody } from "@/types/global";
import { useSendNewWaMessage } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { usePhoneIdStore } from "@/components/whatsapp/inbox/chatselect/accountSelectorStore";
import { PopoverEmojiPicker } from "@/components/whatsapp/templates/Details/TextFormateToolBar";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";
import { showErrorToast } from "@/utils/notifications";

import { WaGetMessagesBody } from "../../../../../../../backend/whatsapp/inbox/message/wamessage.api";
import { formatToCustomTime } from "../../../../../../../utils/dateTime";
import classes from "./styles.module.css";

interface Props {
  exchangeProcess: "send" | "receive";
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
export default function WaInboxSingleMessageLayout(props: Props) {
  const { exchangeProcess } = props;
  const [isHovered, setIsHovered] = useState(false);
  const { selectedContact } = useContactStore();
  const { whatsappSettingsPhoneId } = usePhoneIdStore();
  const platform =
    selectedContact.source.toUpperCase() !== MessagePlatform.INSTAGRAM
      ? MessagePlatform.WHATSAPP
      : MessagePlatform.INSTAGRAM;
  const sendnewWaMessage = useSendNewWaMessage(
    selectedContact.id,
    whatsappSettingsPhoneId,
    platform,
  );

  function getWrapperProps() {
    if (exchangeProcess === "send") {
      return {
        align: "end",
        w: props?.forPreview ? "fit-content" : "100%",
      };
    }
    return { align: "start" };
  }

  function getInnerProps() {
    if (exchangeProcess === "send") {
      return { bg: "light-dark(#dcf0e4,rgb(82, 190, 127)" };
    }
    return { bg: "light-dark(#ffffff, var(--mantine-color-dark-6))" };
  }
  const getColorForUser = (userName = "") => {
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
  const getLatestStatus = (statusObj: { [key: string]: string }) => {
    if (statusObj?.read) return <IconChecks size={14} color="#34B7F1" />;
    if (statusObj?.delivered) return <IconChecks size={14} color="gray" />;
    if (statusObj?.failed)
      return <IconExclamationCircleFilled size={14} color="red" />;
    if (statusObj?.sent) return <IconCheck size={14} color="gray" />;
    return <IconClock size={13} color="gray" />;
  };

  function emojiReactionMap(emoji) {
    switch (emoji) {
      case "❤":
        return "love";
      default:
        return null;
    }
  }
  function sendReaction(emoji: string) {
    if (!whatsappSettingsPhoneId) {
      showErrorToast("Select a account to send the message");
      return;
    }
    let reactionText;
    if (platform === MessagePlatform.INSTAGRAM) {
      reactionText = emojiReactionMap(emoji);
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

  return (
    <Stack
      className={classes.wrapper}
      {...getWrapperProps()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Group gap={4}>
        <Indicator
          disabled={!props.reaction}
          label={
            <ReactionPopOver
              reaction={props.reaction}
              bg={getInnerProps().bg}
            />
          }
          inline
          position={props.reaction?.pos}
          color={"transparent"}
        >
          <Paper className={classes.inner} {...getInnerProps()} py={2}>
            <div>
              <Text
                fz={"xs"}
                c={getColorForUser(props?.messageObject?.sender?.name)}
                fw={500}
                tt={"capitalize"}
              >
                {props?.messageObject?.sender?.name}
              </Text>
              {props?.children}
            </div>
            <Group justify="flex-end" gap={4}>
              <Text fz={10} c={"dimmed"}>
                {formatToCustomTime(props?.messageObject?.waCreatedAt)}
              </Text>
              {exchangeProcess === "send" && (
                <Text>{getLatestStatus(props?.messageObject?.stats)}</Text>
              )}
            </Group>
          </Paper>
        </Indicator>
        {exchangeProcess === "receive" && isHovered && (
          <PopoverEmojiPicker onEmojiClick={sendReaction} />
        )}
        {exchangeProcess === "send" && (
          <Avatar
            name={props?.messageObject?.sender?.name}
            color="initials"
            src={props?.messageObject?.sender?.profile_photo}
            size={"sm"}
            mb={"auto"}
          />
        )}
      </Group>
    </Stack>
  );
}

function reactionEmojiMap(reaction) {
  switch (reaction) {
    case "love":
      return "❤";
  }
}

const ReactionPopOver = ({ reaction, bg }) => {
  return (
    <Popover width={200} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <Text
          style={{
            border: "1px solid var(--light-grey-color-4)",
            borderRadius: "40%",
          }}
          px={4}
          bg={bg}
          mt={"lg"}
          mr={reaction.pos === "bottom-end" && "xl"}
          ml={reaction.pos === "bottom-start" && "xl"}
        >
          {reaction?.emoji || reactionEmojiMap(reaction?.reaction)}
        </Text>
      </Popover.Target>
      <Popover.Dropdown p={"xs"}>
        <Group justify="space-between">
          <Group gap={0}>
            <Avatar size={"sm"} />
            <Text size="xs">{reaction.from}</Text>
          </Group>
          <Text>{reaction?.emoji || reactionEmojiMap(reaction?.reaction)}</Text>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
};
