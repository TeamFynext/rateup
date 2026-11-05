/**
 * Which builder blocks each channel can send. A server-side copy of the UI's
 * `PLATFORM_COMPONENT_SUPPORT` (rateup-ui/src/types/platform.ts): keep the two in step.
 *
 * Only blocks listed here are checked. A node type the map doesn't know (older or
 * experimental nodes) is let through, so saving an existing chatbot never starts failing
 * because of a type this list hasn't caught up with.
 */

import { PlatformType } from "../../../generated/prisma/enums.js";

export type ChatbotPlatform =
  | typeof PlatformType.WHATSAPP
  | typeof PlatformType.INSTAGRAM
  | typeof PlatformType.FACEBOOK;

export const CHATBOT_PLATFORMS: readonly ChatbotPlatform[] = [
  PlatformType.WHATSAPP,
  PlatformType.INSTAGRAM,
  PlatformType.FACEBOOK,
];

const ALL = CHATBOT_PLATFORMS;
const WHATSAPP_ONLY = [PlatformType.WHATSAPP] as const;
/** Instagram and Messenger share Meta's Send API, so they share these message types. */
const META_SEND_API = [PlatformType.INSTAGRAM, PlatformType.FACEBOOK] as const;
const INSTAGRAM_ONLY = [PlatformType.INSTAGRAM] as const;

const BLOCK_SUPPORT: Record<string, readonly ChatbotPlatform[]> = {
  startNode: ALL,
  textNode: ALL,
  imageNode: ALL,
  videoNode: ALL,
  audioNode: ALL,
  pauseNode: ALL,
  assignNode: ALL,
  textInputNode: ALL,

  buttonNode: WHATSAPP_ONLY,
  // Instagram and Messenger send it as a file attachment (PDF only on Instagram).
  documentNode: ALL,
  listNode: WHATSAPP_ONLY,
  ctaUrlNode: WHATSAPP_ONLY,
  templateNode: WHATSAPP_ONLY,
  catalogNode: WHATSAPP_ONLY,
  locationNode: WHATSAPP_ONLY,
  contactsNode: WHATSAPP_ONLY,
  flowNode: WHATSAPP_ONLY,
  leadgenNode: WHATSAPP_ONLY,

  instagramGenericTemplateNode: META_SEND_API,
  instagramQuickReplyNode: META_SEND_API,

  instagramProductTemplateNode: INSTAGRAM_ONLY,
  instagramFollowCheckNode: INSTAGRAM_ONLY,
  // Not blocks (the builder no longer lists them): a story mention is a rule trigger and ice
  // breakers live in the profile. Kept here so older Instagram chatbots holding one still save,
  // and no other channel's does.
  instagramStoryReplyNode: INSTAGRAM_ONLY,
  instagramIceBreakerNode: INSTAGRAM_ONLY,
};

/** The distinct node types in a chatbot graph that its channel can't send. */
export function unsupportedBlocks(
  graph: { nodes?: Array<{ type?: string | null }> } | undefined,
  platform: ChatbotPlatform,
): string[] {
  const found = new Set<string>();
  for (const node of graph?.nodes ?? []) {
    const allowed = node.type ? BLOCK_SUPPORT[node.type] : undefined;
    if (allowed && !allowed.includes(platform)) found.add(node.type!);
  }
  return [...found];
}
