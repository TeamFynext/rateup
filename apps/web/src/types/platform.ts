// Platform types for multi-platform automation
export enum AutomationPlatform {
  WHATSAPP = "whatsapp",
  INSTAGRAM = "instagram",
  /** Facebook Messenger. The value is the API's FACEBOOK platform, lowercased. */
  FACEBOOK = "facebook",
}

const ALL = [
  AutomationPlatform.WHATSAPP,
  AutomationPlatform.INSTAGRAM,
  AutomationPlatform.FACEBOOK,
];
/** Instagram and Messenger share the Send API, so they share these message types. */
const META_SEND_API = [AutomationPlatform.INSTAGRAM, AutomationPlatform.FACEBOOK];

// Component compatibility mapping
// Keyed by node id, which arrives as an arbitrary string — the lookup below
// guards for absence rather than relying on the literal key set.
const PLATFORM_COMPONENT_SUPPORT: Record<string, AutomationPlatform[]> = {
  // Supported on every platform
  textNode: ALL,
  imageNode: ALL,
  videoNode: ALL,
  audioNode: ALL,
  pauseNode: ALL,
  startNode: ALL,
  assignNode: ALL,
  textInputNode: ALL,

  // WhatsApp only
  buttonNode: [AutomationPlatform.WHATSAPP],
  // Instagram and Messenger send it as a file attachment, which Instagram takes as a PDF only.
  documentNode: ALL,
  listNode: [AutomationPlatform.WHATSAPP],
  ctaUrlNode: [AutomationPlatform.WHATSAPP],
  templateNode: [AutomationPlatform.WHATSAPP],
  catalogNode: [AutomationPlatform.WHATSAPP],
  locationNode: [AutomationPlatform.WHATSAPP],
  contactsNode: [AutomationPlatform.WHATSAPP],
  flowNode: [AutomationPlatform.WHATSAPP],
  leadgenNode: [AutomationPlatform.WHATSAPP],

  // Instagram and Messenger. The ids keep their "instagram" prefix: saved flows and the
  // engine's branch handles depend on them.
  instagramGenericTemplateNode: META_SEND_API,
  instagramQuickReplyNode: META_SEND_API,
  // "Continue on WhatsApp": a wa.me button carrying a handoff code that links the person's
  // Instagram / Messenger contact to their WhatsApp number. Meaningless inside WhatsApp.
  continueOnWhatsappNode: META_SEND_API,

  // Instagram only. Story replies and ice breakers are not blocks: a story mention is a rule
  // trigger and ice breakers live in the Instagram profile, so neither is listed here.
  instagramProductTemplateNode: [AutomationPlatform.INSTAGRAM],
  instagramFollowCheckNode: [AutomationPlatform.INSTAGRAM],
};

export function isComponentSupportedOnPlatform(
  componentId: string,
  platform: AutomationPlatform,
): boolean {
  const supportedPlatforms = PLATFORM_COMPONENT_SUPPORT[componentId];
  return supportedPlatforms ? supportedPlatforms.includes(platform) : false;
}

/**
 * The platform a stored chatbot belongs to. The API returns it as stored ("FACEBOOK"), forms
 * hold the lowercase enum value, so case is ignored. Anything unrecognised is WhatsApp, as in
 * the API.
 */
export function automationPlatformOf(value: string | null | undefined): AutomationPlatform {
  const platform = value?.toLowerCase();
  if (platform === AutomationPlatform.INSTAGRAM) return AutomationPlatform.INSTAGRAM;
  if (platform === AutomationPlatform.FACEBOOK) return AutomationPlatform.FACEBOOK;
  return AutomationPlatform.WHATSAPP;
}
