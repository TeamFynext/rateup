/**
 * Query keys for the WhatsApp domain (settings, templates, inbox messages, Meta assets).
 *
 * Every literal is byte-identical to the inline key it replaced, so the cache layout and all
 * existing partial-match invalidations behave exactly as before.
 *
 * Note the two template roots: `["watemplates"]` (the org's templates) and
 * `["waTemplates", "unregistered"]` differ only by capitalisation. They are distinct cache
 * entries today and are preserved as such — but the near-collision is a trap worth
 * resolving deliberately.
 */

/** Opaque state (filters, phone ids) that only ever gets serialised into a key. */
type KeyPart = unknown;

export const whatsappKeys = {
  settings: () => ["waSettings"] as const,
  displayName: (phoneId: KeyPart) => ["waDisplayName", phoneId] as const,
  businessProfile: (phoneId: KeyPart) => ["waBusinessProfile", phoneId] as const,
  metaAssets: (waSettingsId: KeyPart) => ["metaAssets", waSettingsId] as const,

  templates: () => ["watemplates"] as const,
  templatesByType: (templateType: KeyPart) => ["watemplates", templateType] as const,
  template: (id: KeyPart) => ["watemplate", id] as const,
  /** Distinct root from `templates()` — differs by capital T. */
  unregisteredTemplates: () => ["waTemplates", "unregistered"] as const,

  messages: () => ["wa-messages"] as const,
  messagesByContact: (contactId: KeyPart) => ["wa-messages", contactId] as const,
  messagesByConversation: (contactId: KeyPart, phone: KeyPart, conversationId: KeyPart) =>
    ["wa-messages", contactId, phone, conversationId] as const,

  contacts: () => ["wa-contacts"] as const,
  contact: (contactId: KeyPart) => ["wa-contact", contactId] as const,

  assignedInboxUser: () => ["assignedInboxUser"] as const,
  assignedInboxUserByContact: (contactId: KeyPart) => ["assignedInboxUser", contactId] as const,

  shareUrl: (surveyTeamMapShortId: KeyPart) => ["wa-share-url", surveyTeamMapShortId] as const,
} as const;
