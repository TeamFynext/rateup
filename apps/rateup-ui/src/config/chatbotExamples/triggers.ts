import { AutomationPlatform } from "@/types/platform.ts";

/** One way a chatbot can start. The ids are shared across channels where the idea is the same. */
export type ChatbotTriggerKind =
  | "keyword"
  | "any"
  | "leadad"
  | "comment"
  | "story"
  | "link"
  | "getstarted";

export interface ChatbotTriggerOption {
  kind: ChatbotTriggerKind;
  /** The radio's title in the wizard. */
  label: string;
  /** The radio's second line. */
  description: string;
  /** The rule trigger that starts it. None for a lead ad: the chatbot's lead ad block does. */
  triggerEvent?: string;
  /** What is left to do, shown in the editor until the user acts on it. */
  hint: string;
  /** The line above the first message in the preview, for starts that are not a plain DM. */
  context?: string;
}

/** The "How it starts" options of each channel, in the order the wizard lists them. */
export const CHATBOT_TRIGGERS: Record<AutomationPlatform, readonly ChatbotTriggerOption[]> = {
  [AutomationPlatform.WHATSAPP]: [
    {
      kind: "keyword",
      label: "Message with a keyword",
      description: "e.g. “hi”, “menu” or “agent”",
      triggerEvent: "MESSAGE_RECEIVED",
      hint: "Starts when a WhatsApp message contains a keyword you choose in the rule.",
    },
    {
      kind: "any",
      label: "Any new message",
      description: "Replies to every new conversation",
      triggerEvent: "MESSAGE_RECEIVED",
      hint: "Starts on incoming messages. Add a condition in the rule to say which ones.",
    },
    {
      kind: "leadad",
      label: "Lead ad form",
      description: "Someone fills your Meta lead ad",
      hint: "Starts when someone fills your lead ad. Add a Lead ad block after Start and pick your form.",
      context: "Filled your lead ad form",
    },
  ],
  [AutomationPlatform.INSTAGRAM]: [
    {
      kind: "keyword",
      label: "DM with a keyword",
      description: "e.g. “price” or “link”",
      triggerEvent: "MESSAGE_RECEIVED",
      hint: "Starts when an Instagram DM contains a keyword you choose in the rule.",
    },
    {
      kind: "comment",
      label: "Comment on a post or reel",
      description: "Replies privately in DMs",
      triggerEvent: "INSTAGRAM_COMMENT",
      hint: "Starts when someone comments on a post or reel you choose.",
      context: "Replying to a comment on your post",
    },
    {
      kind: "story",
      label: "Story mention",
      description: "Someone tags you in their story",
      triggerEvent: "INSTAGRAM_STORY_MENTION",
      hint: "Starts when someone mentions you in their story.",
      context: "Mentioned you in their story",
    },
    {
      kind: "link",
      label: "ig.me link",
      description: "From an ad, bio link or QR code",
      triggerEvent: "INSTAGRAM_REFERRAL",
      hint: "Starts when someone opens your ig.me link.",
      context: "Opened your ig.me link",
    },
  ],
  [AutomationPlatform.FACEBOOK]: [
    {
      kind: "keyword",
      label: "Message with a keyword",
      description: "e.g. “hours” or “agent”",
      triggerEvent: "MESSAGE_RECEIVED",
      hint: "Starts when a message to your Page contains a keyword you choose in the rule.",
    },
    {
      kind: "getstarted",
      label: "Get Started button",
      description: "First tap on a new chat",
      triggerEvent: "MESSAGE_RECEIVED",
      hint: "Starts when someone taps Get Started. Use your Get Started payload as the rule's keyword (Messenger → Profile).",
      context: "Tapped Get Started",
    },
    {
      kind: "comment",
      label: "Comment on a Page post",
      description: "Replies privately in Messenger",
      triggerEvent: "FACEBOOK_COMMENT",
      hint: "Starts when someone comments on a Page post you choose.",
      context: "Replying to a comment on your Page",
    },
    {
      kind: "link",
      label: "m.me link",
      description: "From an ad, website or QR code",
      triggerEvent: "MESSENGER_REFERRAL",
      hint: "Starts when someone opens your m.me link.",
      context: "Opened your m.me link",
    },
  ],
};

export function triggerOptionsFor(platform: AutomationPlatform) {
  return CHATBOT_TRIGGERS[platform];
}

/** A channel's option of that kind, or undefined when the channel has no such start. */
export function findTrigger(platform: AutomationPlatform, kind: string | undefined) {
  return kind ? CHATBOT_TRIGGERS[platform].find((option) => option.kind === kind) : undefined;
}

export function isTriggerKind(value: unknown): value is ChatbotTriggerKind {
  return (
    typeof value === "string" &&
    Object.values(CHATBOT_TRIGGERS).some((options) =>
      options.some((option) => option.kind === value),
    )
  );
}
