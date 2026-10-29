import { AutomationPlatform } from "@/types/platform.ts";

/**
 * What each channel accepts in one message, from Meta's docs. The builder's editors and its
 * save check read these for the chatbot's own channel; rateup-api keeps the same numbers in
 * `chatbots/chatbotLimits.ts` and refuses a save that breaks them.
 */
export interface PlatformLimits {
  /** Characters in a text message, a question or a quick-reply prompt. */
  text: number;
  /** Characters in a media caption. Meta sends it as a text after the media. */
  caption: number;
  /** Largest upload per media block, in bytes. A block missing here is not on the channel. */
  mediaBytes: Partial<Record<MediaNodeType, number>>;
  quickReplies: { max: number; title: number };
  cards: { max: number; title: number; subtitle: number; buttons: number; buttonTitle: number };
}

export type MediaNodeType = "imageNode" | "videoNode" | "audioNode" | "documentNode";

const MB = 1024 * 1024;

/** Instagram and Messenger share Meta's Send API limits for chips and cards. */
const META_CHOICES = {
  quickReplies: { max: 13, title: 20 },
  cards: { max: 10, title: 80, subtitle: 80, buttons: 3, buttonTitle: 20 },
};

export const PLATFORM_LIMITS: Record<AutomationPlatform, PlatformLimits> = {
  [AutomationPlatform.WHATSAPP]: {
    text: 4096,
    caption: 1024,
    mediaBytes: {
      imageNode: 5 * MB,
      videoNode: 16 * MB,
      audioNode: 16 * MB,
      documentNode: 100 * MB,
    },
    // WhatsApp has neither; these keep the shape whole.
    ...META_CHOICES,
  },
  [AutomationPlatform.INSTAGRAM]: {
    text: 1000,
    caption: 1000,
    mediaBytes: { imageNode: 8 * MB, videoNode: 25 * MB, audioNode: 25 * MB },
    ...META_CHOICES,
  },
  [AutomationPlatform.FACEBOOK]: {
    text: 2000,
    caption: 2000,
    mediaBytes: {
      imageNode: 25 * MB,
      videoNode: 25 * MB,
      audioNode: 25 * MB,
      documentNode: 25 * MB,
    },
    ...META_CHOICES,
  },
};

export function limitsFor(platform: AutomationPlatform | undefined): PlatformLimits {
  return PLATFORM_LIMITS[platform ?? AutomationPlatform.WHATSAPP];
}

/** "5 MB", "300 KB". */
export function formatBytes(bytes: number) {
  return bytes >= MB ? `${Math.round(bytes / MB)} MB` : `${Math.round(bytes / 1024)} KB`;
}
