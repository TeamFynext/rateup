import { IconExternalLink, IconHistory, IconLink } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { IgStoryReplyContent } from "@/utils/whatsapp/inbox.ts";

import WaInboxText from "../text/index.tsx";

/** The story's thumbnail; Meta's CDN link dies with the story, so it falls back to a note. */
function StoryThumbnail({ url }: Readonly<{ url?: string }>) {
  const { t: translations } = useTranslation();
  const [expired, setExpired] = useState(!url);
  if (expired) {
    return (
      <div className="flex h-24 w-16 flex-col items-center justify-center gap-1 rounded-md bg-muted p-1 text-center text-[10px] leading-tight text-muted-foreground">
        <IconHistory className="size-4" aria-hidden="true" />
        {translations("Story no longer available")}
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" className="block w-fit">
      <img
        src={url}
        alt={translations("Story")}
        loading="lazy"
        className="block h-24 w-16 rounded-md object-cover"
        onError={() => setExpired(true)}
      />
    </a>
  );
}

/** "Replied to your story", the story it answered, then what the customer wrote. */
export default function IgStoryReply({ content }: Readonly<{ content: IgStoryReplyContent }>) {
  const { t: translations } = useTranslation();
  const sticker = content.story.linkStickerUrl;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-fit items-start gap-2 rounded-[10px] bg-muted p-2">
        <StoryThumbnail url={content.story.url} />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-foreground">{translations("Replied to your story")}</span>
          {sticker ? (
            <a
              href={sticker}
              target="_blank"
              rel="noreferrer noopener"
              title={sticker}
              className="inline-flex max-w-44 items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <IconLink className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{translations("Story link")}</span>
              <IconExternalLink className="size-3 shrink-0" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
      {content.text ? <WaInboxText messageContent={content.text} /> : null}
    </div>
  );
}
