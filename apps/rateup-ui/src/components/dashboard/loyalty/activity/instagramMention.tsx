import { IconBrandInstagram, IconExternalLink } from "@tabler/icons-react";
import type { TFunction } from "i18next";

/** The ledger `source` the API books an Instagram-mention award under. */
export const INSTAGRAM_MENTION_SOURCE = "instagram_mention";

type MentionKind = "STORY" | "MEDIA" | "COMMENT";

interface MentionMeta {
  mentionKind?: unknown;
  permalink?: unknown;
}

function mentionKind(metadata: unknown): MentionKind | null {
  const kind = (metadata as MentionMeta | null | undefined)?.mentionKind;
  return kind === "STORY" || kind === "MEDIA" || kind === "COMMENT" ? kind : null;
}

function mentionPermalink(metadata: unknown): string | null {
  const link = (metadata as MentionMeta | null | undefined)?.permalink;
  return typeof link === "string" && link.startsWith("https://") ? link : null;
}

/** "Instagram story mention" and friends; null for any other ledger row. */
export function instagramMentionLabel(
  row: { source: string; metadata?: unknown },
  t: TFunction,
): string | null {
  if (row.source !== INSTAGRAM_MENTION_SOURCE) return null;
  switch (mentionKind(row.metadata)) {
    case "STORY":
      return t("Instagram story mention");
    case "MEDIA":
      return t("Instagram post mention");
    case "COMMENT":
      return t("Instagram comment mention");
    default:
      return t("Instagram mention");
  }
}

/** The ledger line for a mention award, with a link to the post when Meta gave one. */
export function InstagramMentionDetail({
  row,
  t,
}: Readonly<{ row: { source: string; metadata?: unknown }; t: TFunction }>) {
  const label = instagramMentionLabel(row, t);
  if (!label) return null;
  const permalink = mentionPermalink(row.metadata);
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <IconBrandInstagram size={12} aria-hidden className="shrink-0" />
      <span className="truncate">{label}</span>
      {permalink && (
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-0.5 text-primary underline-offset-2 hover:underline"
        >
          {t("View")}
          <IconExternalLink size={11} aria-hidden />
        </a>
      )}
    </span>
  );
}
