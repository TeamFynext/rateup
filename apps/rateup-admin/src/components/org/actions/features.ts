import { UNLIMITED_COUNT, type SubscriptionFeatures } from "@/api/org-actions.api";
import { formatNumber } from "@/lib/format";

type Partial2 = Partial<SubscriptionFeatures> | null | undefined;

/** The four counted allowances, in the order the Usage tab shows them. */
export const LIMITS = [
  {
    key: "conversations",
    label: "Conversations",
    hint: "a month",
    get: (f: Partial2) => f?.whatsapp?.conversation?.count?.max,
    set: (f: SubscriptionFeatures, value: number) => {
      f.whatsapp.conversation.count.max = value;
    },
  },
  {
    key: "users",
    label: "Users",
    get: (f: Partial2) => f?.team?.teamMember?.count?.max,
    set: (f: SubscriptionFeatures, value: number) => {
      f.team.teamMember.count.max = value;
    },
  },
  {
    key: "teams",
    label: "Teams",
    get: (f: Partial2) => f?.team?.count?.max,
    set: (f: SubscriptionFeatures, value: number) => {
      f.team.count.max = value;
    },
  },
  {
    key: "formResponses",
    label: "Form responses",
    hint: "a month",
    get: (f: Partial2) => f?.webSurvey?.count?.monthlyResponseLimit,
    set: (f: SubscriptionFeatures, value: number) => {
      f.webSurvey.count.monthlyResponseLimit = value;
    },
  },
] as const;

/** The switches a plan gates. Anything else in the blob is left as the tier set it. */
export const SWITCHES = [
  {
    key: "campaign",
    label: "Campaigns",
    get: (f: Partial2) => f?.whatsapp?.campaign?.active,
    set: (f: SubscriptionFeatures, on: boolean) => {
      f.whatsapp.campaign = { active: on };
    },
  },
  {
    key: "loyalty",
    label: "Loyalty",
    get: (f: Partial2) => f?.whatsapp?.loyalty?.active,
    set: (f: SubscriptionFeatures, on: boolean) => {
      f.whatsapp.loyalty = { active: on };
    },
  },
  {
    key: "referrals",
    label: "Referrals",
    get: (f: Partial2) => f?.whatsapp?.referrals?.active,
    set: (f: SubscriptionFeatures, on: boolean) => {
      f.whatsapp.referrals = { active: on };
    },
  },
  {
    key: "catalog",
    label: "Catalog sync",
    get: (f: Partial2) => f?.whatsapp?.catalog?.active,
    set: (f: SubscriptionFeatures, on: boolean) => {
      f.whatsapp.catalog = { active: on };
    },
  },
  {
    key: "ai",
    label: "Business Agent (AI)",
    get: (f: Partial2) => f?.ai?.active,
    set: (f: SubscriptionFeatures, on: boolean) => {
      f.ai.active = on;
    },
  },
  {
    key: "webhook",
    label: "Form webhooks",
    get: (f: Partial2) => f?.webSurvey?.webhook?.active,
    set: (f: SubscriptionFeatures, on: boolean) => {
      f.webSurvey.webhook = { active: on };
    },
  },
] as const;

export const isUnlimited = (value: number | undefined) => (value ?? 0) >= UNLIMITED_COUNT;

export function formatLimit(value: number | undefined): string {
  if (value === undefined) return "—";
  return isUnlimited(value) ? "Unlimited" : formatNumber(value);
}

const on = (value: boolean | undefined) => ({ active: value ?? false });
const max = (value: number | undefined) => ({ max: value ?? 0 });

/**
 * A complete features blob to edit from. Stored blobs can predate a key; the API's gate
 * (getVerifySubscriptionHandler) treats an absent switch as off, so it starts off here too
 * and saving never opens a feature nobody touched.
 */
export function completeFeatures(stored: Partial2): SubscriptionFeatures {
  const f = stored ?? {};
  return {
    team: {
      active: f.team?.active ?? false,
      count: max(f.team?.count?.max),
      teamMember: {
        active: f.team?.teamMember?.active ?? false,
        count: max(f.team?.teamMember?.count?.max),
      },
    },
    webSurvey: {
      active: f.webSurvey?.active ?? false,
      encryption: on(f.webSurvey?.encryption?.active),
      googleReview: on(f.webSurvey?.googleReview?.active),
      emailNotification: on(f.webSurvey?.emailNotification?.active),
      htmlCodePage: on(f.webSurvey?.htmlCodePage?.active),
      webhook: on(f.webSurvey?.webhook?.active),
      count: { monthlyResponseLimit: f.webSurvey?.count?.monthlyResponseLimit ?? 0 },
    },
    whatsapp: {
      active: f.whatsapp?.active ?? false,
      conversation: {
        active: f.whatsapp?.conversation?.active ?? false,
        count: max(f.whatsapp?.conversation?.count?.max),
      },
      campaign: on(f.whatsapp?.campaign?.active),
      loyalty: on(f.whatsapp?.loyalty?.active),
      referrals: on(f.whatsapp?.referrals?.active),
      catalog: on(f.whatsapp?.catalog?.active),
    },
    ai: {
      active: f.ai?.active ?? false,
      count: {
        completionTokens: f.ai?.count?.completionTokens ?? 0,
        promptTokens: f.ai?.count?.promptTokens ?? 0,
      },
    },
  };
}
