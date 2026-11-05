import { IconPaperclip, IconPlayerPlayFilled } from "@tabler/icons-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import type { IgAttachmentsContent } from "@/utils/whatsapp/inbox.ts";

import WaInboxAudio from "../audio/index.tsx";
import WaInboxDocument from "../document/index.tsx";
import IgSharedPostCard from "../igSharedPost/index.tsx";
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

/** An attachment type with no bubble of its own. */
const UnknownAttachment = ({ url }: { url?: string }) => {
  const { t: translations } = useTranslation();
  return (
    <span className="flex w-fit items-center gap-1.5 rounded-[10px] bg-muted p-2 text-xs text-muted-foreground">
      <IconPaperclip className="size-4 shrink-0" aria-hidden="true" />
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-primary hover:underline"
        >
          {translations("Open attachment")}
        </a>
      ) : (
        translations("This attachment can't be shown here")
      )}
    </span>
  );
};

const WaInboxAttachments = ({ messageContent }: { messageContent: IgAttachmentsContent }) => {
  if (!messageContent.attachments.length) return null;
  function getMediaComponent(attachment: (typeof messageContent.attachments)[number]) {
    switch (attachment?.type) {
      case "audio":
        return <WaInboxAudio messageContent={attachment?.content} />;
      case "file":
        return <WaInboxDocument messageContent={attachment?.content} />;
      case "image":
      case "sticker":
        return <WaInboxImage messageContent={attachment?.content} />;
      case "video":
        return <WaInboxVideo messageContent={attachment?.content} />;
      // A post or reel shared alongside other media; on its own it is an
      // `ig_shared_post` message and never reaches here.
      case "ig_post":
      case "ig_reel":
      case "reel":
      case "share":
        return <IgSharedPostCard attachment={attachment} />;
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

      // `story`, `ig_story`, `media`, `fallback` and anything newer: no
      // dependable shape, so link the URL when there is one.
      default:
        return <UnknownAttachment url={attachment?.content} />;
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {messageContent?.attachments?.map((at, index) => {
        return <React.Fragment key={index}>{getMediaComponent(at)}</React.Fragment>;
      })}
      {messageContent.text ? <WaInboxText messageContent={messageContent.text} /> : null}
    </div>
  );
};

export default WaInboxAttachments;
