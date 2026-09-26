// Platform types for multi-platform automation
export enum AutomationPlatform {
  WHATSAPP = "whatsapp",
  INSTAGRAM = "instagram",
}

// Component compatibility mapping
// Keyed by node id, which arrives as an arbitrary string — the lookup below
// guards for absence rather than relying on the literal key set.
const PLATFORM_COMPONENT_SUPPORT: Record<string, AutomationPlatform[]> = {
  // Supported on both platforms
  textNode: [AutomationPlatform.WHATSAPP, AutomationPlatform.INSTAGRAM],
  imageNode: [AutomationPlatform.WHATSAPP, AutomationPlatform.INSTAGRAM],
  videoNode: [AutomationPlatform.WHATSAPP, AutomationPlatform.INSTAGRAM],
  audioNode: [AutomationPlatform.WHATSAPP, AutomationPlatform.INSTAGRAM],
  pauseNode: [AutomationPlatform.WHATSAPP, AutomationPlatform.INSTAGRAM],
  startNode: [AutomationPlatform.WHATSAPP, AutomationPlatform.INSTAGRAM],
  assignNode: [AutomationPlatform.WHATSAPP, AutomationPlatform.INSTAGRAM],

  // WhatsApp only
  buttonNode: [AutomationPlatform.WHATSAPP],
  documentNode: [AutomationPlatform.WHATSAPP],
  listNode: [AutomationPlatform.WHATSAPP],
  ctaUrlNode: [AutomationPlatform.WHATSAPP],
  templateNode: [AutomationPlatform.WHATSAPP],
  catalogNode: [AutomationPlatform.WHATSAPP],
  locationNode: [AutomationPlatform.WHATSAPP],
  contactsNode: [AutomationPlatform.WHATSAPP],
  flowNode: [AutomationPlatform.WHATSAPP],
  leadgenNode: [AutomationPlatform.WHATSAPP],
  textInputNode: [AutomationPlatform.WHATSAPP],

  // Instagram specific
  instagramStoryReplyNode: [AutomationPlatform.INSTAGRAM],
  instagramGenericTemplateNode: [AutomationPlatform.INSTAGRAM],
  instagramProductTemplateNode: [AutomationPlatform.INSTAGRAM],
  instagramQuickReplyNode: [AutomationPlatform.INSTAGRAM],
  instagramIceBreakerNode: [AutomationPlatform.INSTAGRAM],
};

export function isComponentSupportedOnPlatform(
  componentId: string,
  platform: AutomationPlatform,
): boolean {
  const supportedPlatforms = PLATFORM_COMPONENT_SUPPORT[componentId];
  return supportedPlatforms ? supportedPlatforms.includes(platform) : false;
}
