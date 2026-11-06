import { PlatformType, TriggerEvent } from "../../generated/prisma/enums.js";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { getMessengerProfile } from "../whatsapp/facebook/messenger_profile.service.js";
import { getMetaChannelById } from "../whatsapp/metaChannel/metaChannel.service.js";
import { createRule } from "../whatsapp/automatedReply/wa_rule.service.js";
import {
  createRuleSchema,
  type CreateRuleInput,
} from "../whatsapp/automatedReply/wa_rule.schema.js";
import type { ChatbotPlatform } from "./chatbotBlocks.js";

/**
 * How a chatbot starts: the "How it starts" choices in the creation wizard. The UI keeps the
 * same ids, labels and channels in `config/chatbotExamples/triggers.ts`.
 */
export const CHATBOT_START_KINDS = [
  "keyword",
  "any",
  "leadad",
  "comment",
  "story",
  "storyreply",
  "link",
  "getstarted",
] as const;
export type ChatbotStartKind = (typeof CHATBOT_START_KINDS)[number];

/** The keyword a rule waits for until the user types theirs. An empty one never matches. */
const NO_KEYWORD_YET = "";
/** Matches any message (see validateRuleCondition). */
const ANY_MESSAGE = "*";
/** Sent by the Get Started button when the Page has none of its own yet. */
export const DEFAULT_GET_STARTED_PAYLOAD = "GET_STARTED";

type RuleSpec = Pick<CreateRuleInput, "triggerEvent" | "groups" | "options">;

const keywordRule = (value: string, operator: "CONTAINS" | "EQUALS" = "CONTAINS"): RuleSpec => ({
  triggerEvent: TriggerEvent.MESSAGE_RECEIVED,
  groups: [
    {
      operator: "AND",
      conditions: [{ field: "MESSAGE_BODY", operator, value }],
    },
  ],
});

/**
 * The rule each start needs, per channel. A missing entry means the channel has no such
 * start; `null` means nothing to create (a lead ad starts the chatbot from its own block).
 */
const START_RULES: Record<
  ChatbotPlatform,
  Partial<Record<ChatbotStartKind, ((getStartedPayloads: string[]) => RuleSpec) | null>>
> = {
  WHATSAPP: {
    keyword: () => keywordRule(NO_KEYWORD_YET),
    // Once a day per person, so it greets a conversation rather than answering every line.
    any: () => ({
      ...keywordRule(ANY_MESSAGE),
      options: { sendOncePerDay: true },
    }),
    leadad: null,
  },
  INSTAGRAM: {
    keyword: () => keywordRule(NO_KEYWORD_YET),
    comment: () => ({
      triggerEvent: TriggerEvent.INSTAGRAM_COMMENT,
      options: { instagramScope: "ALL", instagramCommentSource: "POSTS" },
    }),
    story: () => ({ triggerEvent: TriggerEvent.INSTAGRAM_STORY_MENTION }),
    // Any reply to any story until the user narrows it on the Stories tab.
    storyreply: () => ({
      triggerEvent: TriggerEvent.INSTAGRAM_STORY_REPLY,
      options: { instagramStoryScope: "ALL" },
    }),
    link: () => ({ triggerEvent: TriggerEvent.INSTAGRAM_REFERRAL }),
  },
  FACEBOOK: {
    keyword: () => keywordRule(NO_KEYWORD_YET),
    // One condition per payload, so a rule on several Pages answers each Page's own button.
    getstarted: (payloads) => ({
      triggerEvent: TriggerEvent.MESSAGE_RECEIVED,
      groups: [
        {
          operator: "OR",
          conditions: payloads.map((value) => ({
            field: "MESSAGE_BODY",
            operator: "EQUALS",
            value,
          })),
        },
      ],
    }),
    comment: () => ({
      triggerEvent: TriggerEvent.FACEBOOK_COMMENT,
      options: { instagramScope: "ALL" },
    }),
    link: () => ({ triggerEvent: TriggerEvent.MESSENGER_REFERRAL }),
  },
};

export function startOffered(platform: ChatbotPlatform, kind: ChatbotStartKind) {
  return kind in START_RULES[platform];
}

/** Why no rule was made, for the UI to word. */
export type StartRuleSkip = "not_needed" | "no_account" | "failed";

export interface StartRuleResult {
  rule: { id: string; name: string; isActive: boolean } | null;
  skipped?: StartRuleSkip;
}

/** The accounts the rule runs on: the one picked, or every connected one on the channel. */
async function ruleAccounts(orgId: string, platform: ChatbotPlatform, accountId?: string | null) {
  const channels = await prisma.channel.findMany({
    where: { orgId, platform, ...(accountId && { accountId }) },
    select: { id: true, accountId: true },
    orderBy: { createdAt: "asc" },
  });
  return channels;
}

/**
 * The payload the Page's Get Started button already sends, so the rule answers it. A Page
 * without one, or one we cannot read, gets the default; the editor offers to set it.
 */
async function getStartedPayload(orgId: string, channelId: string | undefined) {
  if (!channelId) return DEFAULT_GET_STARTED_PAYLOAD;
  try {
    const channel = await getMetaChannelById(channelId, orgId);
    if (channel?.platform !== PlatformType.FACEBOOK || !channel.pageAccessToken) {
      return DEFAULT_GET_STARTED_PAYLOAD;
    }
    const profile = await getMessengerProfile(channel.pageAccessToken);
    return profile.getStarted || DEFAULT_GET_STARTED_PAYLOAD;
  } catch (error) {
    log.warn({ err: error }, "[Chatbots] Could not read the Page's Get Started payload");
    return DEFAULT_GET_STARTED_PAYLOAD;
  }
}

/** Rule names are unique per org: "Welcome bot · start", then "… start 2", and so on. */
async function freeRuleName(orgId: string, base: string) {
  const taken = new Set(
    (
      await prisma.rule.findMany({
        where: { orgId, name: { startsWith: base } },
        select: { name: true },
      })
    ).map((rule) => rule.name),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const name = `${base} ${n}`;
    if (!taken.has(name)) return name;
  }
  return `${base} ${Date.now()}`;
}

/**
 * Creates the rule that starts a new chatbot, switched off: the bot is still the example's
 * placeholder text, and a keyword rule has no keyword yet. The editor turns it on once the
 * user is ready. Never throws: a chatbot without its rule is still a chatbot, and the editor
 * then offers to make the rule by hand.
 */
export async function createStartRule(
  orgId: string,
  chatbot: { id: string; name: string; platform: ChatbotPlatform },
  start: { kind: ChatbotStartKind; accountId?: string | null },
): Promise<StartRuleResult> {
  const build = START_RULES[chatbot.platform][start.kind];
  if (!build) return { rule: null, skipped: "not_needed" };

  try {
    const accounts = await ruleAccounts(orgId, chatbot.platform, start.accountId);
    if (!accounts.length) return { rule: null, skipped: "no_account" };

    const payloads =
      start.kind === "getstarted"
        ? [
            ...new Set(
              await Promise.all(accounts.map((account) => getStartedPayload(orgId, account.id))),
            ),
          ]
        : [DEFAULT_GET_STARTED_PAYLOAD];
    const spec = build(payloads);

    const input = createRuleSchema.parse({
      name: await freeRuleName(orgId, `${chatbot.name} · start`.slice(0, 180)),
      platform: chatbot.platform,
      platforms: [chatbot.platform],
      whatsappSettingsPhoneIds: accounts.map((account) => account.accountId),
      isActive: false,
      ...spec,
      actions: [{ type: "TRIGGER_CHATBOT", value: chatbot.id }],
    });
    const rule = await createRule({ ...input, orgId });
    return { rule: { id: rule.id, name: rule.name, isActive: rule.isActive } };
  } catch (error) {
    log.error({ err: error, chatbotId: chatbot.id }, "[Chatbots] Could not create the start rule");
    return { rule: null, skipped: "failed" };
  }
}

/** What the editor needs to know about a rule that starts a chatbot. */
export interface ChatbotRule {
  id: string;
  name: string;
  isActive: boolean;
  triggerEvent: string;
  accountIds: string[];
  /** The rule's message keywords (MESSAGE_BODY values), "" for one not filled in yet. */
  keywords: string[];
}

/** The rules whose actions start this chatbot, oldest first. */
export async function chatbotRules(chatbotId: string, orgId: string): Promise<ChatbotRule[]> {
  const rules = await prisma.rule.findMany({
    where: {
      orgId,
      actions: {
        some: { type: "TRIGGER_CHATBOT", value: { equals: chatbotId } },
      },
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      triggerEvent: true,
      whatsappSettingsPhoneIds: true,
      groups: {
        select: { conditions: { select: { field: true, value: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return rules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    isActive: rule.isActive,
    triggerEvent: rule.triggerEvent,
    accountIds: rule.whatsappSettingsPhoneIds,
    keywords: rule.groups.flatMap((group) =>
      group.conditions
        .filter((condition) => condition.field === "MESSAGE_BODY")
        .map((condition) => condition.value ?? ""),
    ),
  }));
}
