import { IconBrandInstagram, IconExternalLink, IconMovie, IconPhoto } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { IgAttachmentItem } from "@/utils/whatsapp/inbox.ts";

const isReel = (type: string) => type === "ig_reel" || type === "reel";

/** Meta's CDN links for a reel are often the video file itself, not a still. */
const looksLikeVideo = (url: string) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url);

const isInstagramPage = (url: string) => {
  try {
    return /(^|\.)instagram\.com$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
};

/**
 * The media of a shared post or reel. Tries the URL as a still first (a video
 * for a reel whose link is the file), and settles on a placeholder when neither
 * loads — the CDN links expire, and some point at a page rather than media.
 */
function SharedPostMedia({ url, reel }: Readonly<{ url: string; reel: boolean }>) {
  const { t: translations } = useTranslation();
  const [mode, setMode] = useState<"image" | "video" | "none">(
    !url ? "none" : reel && looksLikeVideo(url) ? "video" : "image",
  );

  if (mode === "image") {
    return (
      <img
        src={url}
        alt={reel ? translations("Shared reel") : translations("Shared post")}
        loading="lazy"
        className="block max-h-64 w-full object-cover"
        onError={() => setMode(reel ? "video" : "none")}
      />
    );
  }
  if (mode === "video") {
    return (
      <video
        src={url}
        preload="metadata"
        muted
        playsInline
        controls
        aria-label={translations("Shared reel")}
        className="block max-h-64 w-full bg-muted object-cover"
        onError={() => setMode("none")}
      />
    );
  }
  const Icon = reel ? IconMovie : IconPhoto;
  return (
    <div className="flex h-28 w-full items-center justify-center bg-muted text-muted-foreground">
      <Icon className="size-8" aria-hidden="true" />
    </div>
  );
}

/** A post or reel the customer shared into the chat: thumbnail, title, link out. */
export function IgSharedPostCard({ attachment }: Readonly<{ attachment: IgAttachmentItem }>) {
  const { t: translations } = useTranslation();
  const reel = isReel(attachment.type);
  const url = attachment.content;
  const linkLabel = isInstagramPage(url)
    ? translations("Open on Instagram")
    : reel
      ? translations("Open reel")
      : translations("Open post");

  return (
    <div className="flex w-56 max-w-full flex-col overflow-hidden rounded-[10px] border border-border bg-card">
      <SharedPostMedia url={url} reel={reel} />
      <div className="flex flex-col gap-1.5 p-2.5">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <IconBrandInstagram className="size-3.5 shrink-0" aria-hidden="true" />
          {reel ? translations("Shared a reel") : translations("Shared a post")}
        </span>
        {attachment.title ? (
          <p className="line-clamp-3 text-sm text-foreground whitespace-pre-wrap">
            {attachment.title}
          </p>
        ) : null}
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {linkLabel}
            <IconExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default IgSharedPostCard;
