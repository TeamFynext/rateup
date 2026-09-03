/**
 * Query keys for automation, Zoho and survey response listings — the last of
 * the roots that were declared in more than one file.
 *
 * Every literal is byte-identical to the inline key it replaced.
 */

/** Opaque state that only ever gets serialised into a key. */
type KeyPart = unknown;

export const automationKeys = {
  waAutomatedReply: (params: KeyPart) => ["waAutomatedReply", params] as const,
  instagramAutomation: (params: KeyPart) => ["instagramAutomation", params] as const,
  eventTriggers: (programId: KeyPart) => ["event-triggers", programId] as const,
} as const;

export const zohoKeys = {
  leads: (orgId: KeyPart) => ["zoho-leads", orgId] as const,
  contacts: (orgId: KeyPart, product: KeyPart) => ["zoho-contacts", orgId, product] as const,
  users: (orgId: KeyPart, product: KeyPart) => ["zoho-users", orgId, product] as const,
  pipelines: (product: KeyPart) => ["zoho-pipelines", product] as const,
} as const;

export const cardKeys = {
  all: () => ["card"] as const,
  detail: (cardId: KeyPart) => ["card", cardId] as const,
} as const;

export const allResponsesKeys = {
  all: () => ["allresponses"] as const,
  bySurvey: (surveyId: KeyPart) => ["allresponses", surveyId] as const,
} as const;
