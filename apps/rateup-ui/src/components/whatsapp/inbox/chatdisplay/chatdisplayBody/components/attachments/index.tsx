import React from "react";

import { Group, Stack, Text } from "@mantine/core";
import { IconPlayerPlayFilled } from "@tabler/icons-react";

import type { IgReceiveMessageBody } from "@/types/global";

import WaInboxAudio from "../audio/index.tsx";
import WaInboxDocument from "../document/index.tsx";
import WaInboxImage from "../image/index.tsx";
import WaInboxText from "../text/index.tsx";
import WaInboxVideo from "../video/index.tsx";

const WaInboxAttachments = ({
  messageContent,
}: {
  messageContent: {
    attachments: {
      content: string;
      type: IgReceiveMessageBody["message"]["attachments"][0]["type"];
    }[];
    text?: string;
  };
}) => {
  if (!messageContent.attachments.length) return;
  function getMediaComponent(attachment) {
    switch (attachment?.type) {
      case "audio":
        return <WaInboxAudio messageContent={attachment?.content} />;
      case "file":
        return <WaInboxDocument messageContent={attachment?.content} />;
      case "image":
      case "sticker":
        return <WaInboxImage messageContent={attachment?.content} />;
      case "video":
      case "ig_reel":
      case "reel":
        return <WaInboxVideo messageContent={attachment?.content} />;
      case "share":
        return <WaInboxText messageContent={attachment?.content} />;
      case "story_mention":
        return (
          <>
            <Text
              style={{ borderRadius: "10px" }}
              c="var(--grey-color-7)"
              p={"xs"}
              size="xs"
              bg="var(--light-grey-color-5)"
            >
              Mentioned you in their story
            </Text>
            <WaInboxText messageContent={attachment?.content} />
          </>
        );
      case "ephemeral":
        return (
          <Group
            gap={"xs"}
            p={"xs"}
            style={{ borderRadius: "10px" }}
            bg="var(--light-grey-color-5)"
          >
            <IconPlayerPlayFilled color="var(--grey-color-7)" size={"1rem"} />
            <Text c="var(--grey-color-7)" size="xs">
              Disappearing media
            </Text>
          </Group>
        );

      default:
        return <Text c="red">Unsupported message type</Text>;
    }
  }

  return (
    <Stack>
      {messageContent?.attachments?.map((at, index) => {
        return (
          <React.Fragment key={index}>{getMediaComponent(at)}</React.Fragment>
        );
      })}
    </Stack>
  );
};

export default WaInboxAttachments;
