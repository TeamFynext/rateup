import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { InstagramEvent } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";

// This module parses Meta's epoch and ISO timestamps with dayjs, so it registers
// utc itself rather than relying on whichever other module happened to load first
// (the mistake wamessage.utils.ts documents).
dayjs.extend(utc);

/**
 * Epoch values below this are seconds, above are milliseconds. 1e11 seconds is
 * year 5138 and 1e11 milliseconds is 1973, so nothing real is ambiguous.
 */
const MS_THRESHOLD = 1e11;

/** One Meta time value → epoch milliseconds, or null if it is not a time at all. */
function toMillis(candidate: number | string | undefined): number | null {
  if (candidate === undefined || candidate === null || candidate === "") {
    return null;
  }

  // Numbers, and the numeric strings Meta sometimes sends, are epochs — which
  // dayjs cannot tell apart from a year, so the unit is chosen here and parsed
  // with the matching constructor.
  const epoch = typeof candidate === "number" ? candidate : Number(candidate);
  if (Number.isFinite(epoch) && String(candidate).trim() !== "") {
    if (epoch <= 0) {
      return null;
    }
    const parsed = epoch < MS_THRESHOLD ? dayjs.unix(epoch) : dayjs(epoch);
    return parsed.isValid() ? parsed.valueOf() : null;
  }

  // Graph API reads return created_time as an ISO string ("2026-08-05T13:34:50+0000").
  const parsed = dayjs(candidate);
  return parsed.isValid() ? parsed.valueOf() : null;
}

/**
 * Epoch milliseconds for a comment event. Meta's `comments` webhook does NOT
 * carry `created_time` (it is a Graph API read field), so the comment's own time
 * is only sometimes there; the entry's `time` is the documented fallback. Entry
 * time arrives in seconds on change events and milliseconds on messaging ones,
 * hence the unit sniffing. Falls back to now rather than producing an invalid
 * date — a wrong-by-seconds timestamp beats a message dropped on the floor.
 */
export function resolveCommentTimestampMs(
  createdTime?: number | string,
  entryTime?: number | string,
): number {
  for (const candidate of [createdTime, entryTime]) {
    const millis = toMillis(candidate);
    if (millis !== null) {
      return millis;
    }
  }
  return dayjs().valueOf();
}

export function getInstagramWebhookEvent(
  data: InstagramWebhookBody["entry"][0]["messaging"][0],
): InstagramEvent | null {
  try {
    if (data.message?.is_echo) {
      return null;
    }

    if (data.postback) {
      return InstagramEvent.POSTBACK;
    }

    if (data.message) {
      const storyMention = data.message.attachments?.some(
        (attachment) => attachment.type === "story_mention",
      );

      if (storyMention) {
        return InstagramEvent.STORY_MENTION;
      }

      const carriesContent = Boolean(
        data.message.text || data.message.attachments?.length || data.message.quick_reply,
      );
      if (data.message.referral && !carriesContent) {
        return InstagramEvent.REFERRAL;
      }

      return InstagramEvent.MESSAGE;
    }

    if (data.reaction) {
      return InstagramEvent.MESSAGE_REACTION;
    }

    if (data.read) {
      return InstagramEvent.MESSAGE_SEEN;
    }

    return null;
  } catch (error) {
    log.error({ err: error }, "Error determining Instagram event type");
    return null;
  }
}
