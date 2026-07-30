import { IconPlayerPlayFilled } from "@tabler/icons-react";
import React, { useState } from "react";

import type { IgReceiveMessageBody } from "@/types/global";

import WaInboxAudio from "../audio/index.tsx";
import WaInboxDocument from "../document/index.tsx";
import WaInboxImage from "../image/index.tsx";
import WaInboxText from "../text/index.tsx";
import WaInboxVideo from "../video/index.tsx";

const StoryMentionPreview = ({ url }: { url: string }) => {
  const [expired, setExpired] = useState(false);
  if (expired) {
    return (
      <span className="text-xs text-foreground p-2 bg-muted rounded-[10px] w-fit">
        Story is no longer available
      </span>
    );
  }
  return (
    <img
      src={url}
      alt="Story"
      className="max-w-[200px] max-h-[300px] rounded-[10px] block"
      onError={() => setExpired(true)}
    />
  );
};

const WaInboxAttachments = ({
  messageContent,
}: {
  messageContent: {
    attachments: {
      content: string;
      type: NonNullable<NonNullable<IgReceiveMessageBody["message"]>["attachments"]>[0]["type"];
    }[];
    text?: string;
  };
}) => {
  if (!messageContent.attachments.length) return null;
  function getMediaComponent(attachment: any) {
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
          <div className="flex flex-col gap-2">
            <span className="text-xs text-foreground p-2 bg-muted rounded-[10px] w-fit">
              Mentioned you in their story
            </span>
            {attachment?.content ? <StoryMentionPreview url={attachment.content} /> : null}
          </div>
        );
      case "ephemeral":
        return (
          <div className="flex items-center gap-1.5 p-2 bg-muted rounded-[10px] w-fit">
            <IconPlayerPlayFilled className="text-foreground" size={16} />
            <span className="text-xs text-foreground font-medium">Disappearing media</span>
          </div>
        );

      default:
        return <span className="text-xs text-red-500 font-medium">Unsupported message type</span>;
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {messageContent?.attachments?.map((at, index) => {
        return <React.Fragment key={index}>{getMediaComponent(at)}</React.Fragment>;
      })}
    </div>
  );
};

export default WaInboxAttachments;
