import axios from "@/config/axios";

/**
 * Contact details, identities and merging. Mirrors rateup-api's
 * `src/modules/contact/merge/merge.route.ts` (`/api/contact/merge`, `/api/contact/identities`)
 * and rateup-ui's `merge.api.ts`, which has the same types.
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
  source?: string | null;
  other?: string | null;
  lastMessagePlatform?: string | null;
  identities?: Pick<ContactIdentity, "kind" | "value" | "username" | "displayName" | "channel">[];
}

export interface MergeConflict {
  /** `name`, `email`, `address`, `dob`, `gender`, `notes`, `lifecycleId` or `custom:<fieldId>`. */
  field: string;
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

/** The part of `GET /api/contact/:id/details` the Contact info screen shows. */
export interface ContactFullDetails {
  id: string;
  createdAt: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  dob: string | null;
  gender?: string | null;
  notes: string | null;
  source: string | null;
  external_id: string | null;
  Lifecycle: { id: string; name: string } | null;
  customFields: Array<{
    id: string;
    fieldId: string;
    value: string;
    field?: { id: string; name: string; type: string; visibility: boolean };
  }>;
  contactGroups: Array<{ contactGroup?: { id: string; name: string } }>;
  loyaltyAccounts?: Array<{
    id: string;
    currentPoints: number;
    currentTier?: { id: string; name: string } | null;
    program?: { id: string; name: string };
  }>;
}

/** A row of the contacts list (`GET /api/contact`), as the merge picker reads it. */
export interface ContactSearchRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  whatsappUserName?: string | null;
  igsId?: string | null;
  bsuid?: string | null;
}

const MERGE_URL = "/api/contact/merge";
const IDENTITY_URL = "/api/contact/identities";

export async function getContactFullDetails(contactId: string) {
  return (await axios.get<ContactFullDetails>(`/api/contact/${contactId}/details`)).data;
}

export async function getContactIdentityOverview(contactId: string) {
  return (await axios.get<ContactIdentityOverview>(`${MERGE_URL}/contact/${contactId}`)).data;
}

export async function searchContacts(search: string) {
  const res = await axios.get<{ users: ContactSearchRow[]; totalCount: number }>("/api/contact", {
    params: { page: 0, limit: 20, search, sort: "createdAt", desc: "desc", type: "NORMAL" },
  });
  return res.data;
}

export async function getMergePreview(sourceId: string, targetId: string) {
  return (await axios.get<MergePreview>(`${MERGE_URL}/preview`, { params: { sourceId, targetId } }))
    .data;
}

export async function mergeContacts(body: MergeBody) {
  return (await axios.post<{ contact: MergeContact; mergeId: string }>(MERGE_URL, body)).data;
}

export async function dismissMergeSuggestion(suggestionId: string) {
  return (await axios.post<{ ok: boolean }>(`${MERGE_URL}/suggestions/${suggestionId}/dismiss`))
    .data;
}

export async function addContactIdentity(
  contactId: string,
  body: { kind: "PHONE" | "EMAIL"; value: string },
) {
  return (await axios.post<{ identityId: string }>(`${IDENTITY_URL}/${contactId}`, body)).data;
}

export async function updateContactIdentity(
  contactId: string,
  identityId: string,
  body: { value?: string; isPrimary?: true },
) {
  return (await axios.patch<{ ok: boolean }>(`${IDENTITY_URL}/${contactId}/${identityId}`, body))
    .data;
}

export async function removeContactIdentity(contactId: string, identityId: string) {
  return (await axios.delete<{ ok: boolean }>(`${IDENTITY_URL}/${contactId}/${identityId}`)).data;
}
