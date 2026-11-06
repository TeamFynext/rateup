import { axiosClient } from "../../apiClient";
import { CONTACT_BASE_URL } from "./contacts.api";

/**
 * Contact merge and identities. Mirrors `rateup-api/src/modules/contact/merge/merge.route.ts`
 * (`/api/contact/merge`, `/api/contact/identities`). The axios base URL already ends in `/api`.
 */

export type IdentityKind =
  | "PHONE"
  | "EMAIL"
  | "WA_BSUID"
  | "IG_SCOPED"
  | "FB_PSID"
  | "WEBCHAT"
  | "EXTERNAL";

export interface IdentityChannel {
  id: string;
  platform: string;
  name: string | null;
  username: string | null;
  address?: string | null;
  whatsapp?: { businessPortfolioId?: string | null; businessPortfolioName: string | null } | null;
}

/** A `ContactIdentity` row. Legacy rows (read off the contact's columns) carry no id. */
export interface ContactIdentity {
  id?: string;
  kind: IdentityKind;
  value: string;
  isPrimary?: boolean;
  verified?: boolean;
  source?: string;
  username?: string | null;
  displayName?: string | null;
  channel?: IdentityChannel | null;
}

export type MergeSide = "source" | "target";
export type MergeSuggestionReason =
  | "SAME_PHONE"
  | "SAME_EMAIL"
  | "BSUID_PHONE_SPLIT"
  | "CUSTOMER_PROVIDED";
export type MergeReason = "MANUAL" | "HANDOFF" | "API" | "SUGGESTION";
export type MergeWarning =
  | "SPAM_CARRIES_OVER"
  | "BLOCK_CARRIES_OVER"
  | "OPT_OUT_CARRIES_OVER"
  | "LOYALTY_ACCOUNT_REMOVED"
  | "SHARED_CAMPAIGNS";

/** The contact columns the merge screens read. */
export interface MergeContact {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  bsuid?: string | null;
  igsId?: string | null;
  psid?: string | null;
  whatsappUserName?: string | null;
  profilePic?: string | null;
  createdAt: string;
  lastReceivedMessageTimeStamp?: string | null;
  /** Where the contact came from: `WEBCHAT`, `whatsapp`, an import… */
  source?: string | null;
  /** A webchat visitor's id: what they typed into the widget. */
  other?: string | null;
  lastMessagePlatform?: string | null;
  /** Every phone, email and account it is known by (suggestion cards only). */
  identities?: Pick<ContactIdentity, "kind" | "value" | "username" | "displayName" | "channel">[];
}

export interface MergeConflict {
  /** `name`, `email`, `address`, `dob`, `gender`, `notes`, `lifecycleId` or `custom:<fieldId>`. */
  field: string;
  /** The custom field's name; for a built-in field the API echoes the key. */
  label: string;
  source: unknown;
  target: unknown;
  type?: string;
}

export interface LoyaltyAccountCard {
  accountId: string;
  contactId: string;
  points: number;
  tier: string | null;
}

export interface MergePreview {
  source: MergeContact;
  target: MergeContact;
  conflicts: MergeConflict[];
  identities: Array<ContactIdentity & { side: MergeSide }>;
  legacyIdentities: { source: ContactIdentity[]; target: ContactIdentity[] };
  combined: {
    labels: Array<{ id: string; name: string; color?: string | null }>;
    audiences: Array<{ id: string; name: string }>;
    conversations: number;
    messages: number;
    orders: number;
    campaignParticipations: number;
    calls: number;
    sharedCampaigns: number;
  };
  lifecycles: Array<{ id: string; name: string }>;
  loyalty: Array<{
    programId: string;
    programName: string;
    keep: LoyaltyAccountCard;
    remove: LoyaltyAccountCard | null;
  }>;
  warnings: MergeWarning[];
}

export interface MergeBody {
  sourceId: string;
  targetId: string;
  fieldChoices?: Record<string, MergeSide>;
  suggestionId?: string;
}

export interface MergeSuggestion {
  id: string;
  reason: MergeSuggestionReason;
  detail?: string | null;
  status: string;
  createdAt: string;
  contactA: MergeContact;
  contactB: MergeContact;
}

export interface ContactIdentityOverview {
  identities: ContactIdentity[];
  legacyIdentities: ContactIdentity[];
  suggestions: Array<{
    id: string;
    reason: MergeSuggestionReason;
    detail?: string | null;
    contact: MergeContact;
  }>;
  merges: Array<{
    id: string;
    sourceContactId: string;
    sourceName: string | null;
    mergedBy: string | null;
    mergedByName: string | null;
    reason: MergeReason | null;
    createdAt: string;
  }>;
}

const MERGE_URL = `${CONTACT_BASE_URL}/merge`;
const IDENTITY_URL = `${CONTACT_BASE_URL}/identities`;

export async function getMergePreview(sourceId: string, targetId: string) {
  const res = await axiosClient.get<MergePreview>(`${MERGE_URL}/preview`, {
    params: { sourceId, targetId },
  });
  return res.data;
}

export async function mergeContacts(body: MergeBody) {
  const res = await axiosClient.post<{ contact: MergeContact; mergeId: string }>(MERGE_URL, body);
  return res.data;
}

export async function getMergeSuggestions(params: { cursor?: string | null; limit?: number }) {
  const res = await axiosClient.get<{ items: MergeSuggestion[]; nextCursor: string | null }>(
    `${MERGE_URL}/suggestions`,
    {
      params: {
        status: "PENDING",
        limit: params.limit ?? 25,
        ...(params.cursor ? { cursor: params.cursor } : {}),
      },
    },
  );
  return res.data;
}

export async function getMergeSuggestionCount() {
  const res = await axiosClient.get<{ pending: number }>(`${MERGE_URL}/suggestions/count`);
  return res.data;
}

export async function dismissMergeSuggestion(suggestionId: string) {
  const res = await axiosClient.post<{ ok: boolean }>(
    `${MERGE_URL}/suggestions/${suggestionId}/dismiss`,
  );
  return res.data;
}

export async function getContactIdentityOverview(contactId: string) {
  const res = await axiosClient.get<ContactIdentityOverview>(`${MERGE_URL}/contact/${contactId}`);
  return res.data;
}

export async function addContactIdentity(
  contactId: string,
  body: { kind: "PHONE" | "EMAIL"; value: string },
) {
  const res = await axiosClient.post<{ identityId: string }>(`${IDENTITY_URL}/${contactId}`, body);
  return res.data;
}

/** Corrects a phone or email the contact is known by, and/or makes it the main one. */
export async function updateContactIdentity(
  contactId: string,
  identityId: string,
  body: { value?: string; isPrimary?: true },
) {
  const res = await axiosClient.patch<{ ok: boolean }>(
    `${IDENTITY_URL}/${contactId}/${identityId}`,
    body,
  );
  return res.data;
}

/** Looks through the org's existing contacts for duplicates; raises suggestions only. */
export async function scanForDuplicates() {
  const res = await axiosClient.post<{ pairs: number; pending: number }>(
    `${MERGE_URL}/suggestions/scan`,
    {},
  );
  return res.data;
}

export async function removeContactIdentity(contactId: string, identityId: string) {
  const res = await axiosClient.delete<{ ok: boolean }>(
    `${IDENTITY_URL}/${contactId}/${identityId}`,
  );
  return res.data;
}
