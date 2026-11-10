/** Fields a person picks between when the two contacts disagree. */
export const MERGE_CHOOSABLE_FIELDS = [
  "name",
  "email",
  "address",
  "dob",
  "gender",
  "notes",
  "lifecycleId",
] as const;
export type MergeChoosableField = (typeof MERGE_CHOOSABLE_FIELDS)[number];

/** `name` etc., or `custom:<fieldId>` for a custom field. */
export type MergeFieldKey = MergeChoosableField | `custom:${string}`;
export type MergeFieldChoices = Partial<Record<MergeFieldKey, "source" | "target">>;

export type MergeReason = "MANUAL" | "HANDOFF" | "API" | "SUGGESTION";

export interface MergeActor {
  /** Null for a system merge (handoff link) or an API key. */
  userId: string | null;
  reason: MergeReason;
}

/** The smaller loyalty account a merge removed, kept in the audit for support. */
export interface MergedLoyaltyAccountSnapshot {
  accountId: string;
  programId: string;
  currentPoints: number;
  lifetimePoints: number;
  totalSpend: string;
  currentTierId: string | null;
  referralCode: string;
  createdAt: string;
  transactionCount: number;
  /** The newest transactions, newest first. */
  recentTransactions: {
    points: number;
    type: string | null;
    description: string | null;
    at: string;
  }[];
}

/** `ContactMerge.snapshot`: what the source contact was before it was merged away. */
export interface ContactMergeSnapshot {
  contact: Record<string, unknown>;
  identities: { kind: string; scope: string; value: string; source: string }[];
  fieldChoices: MergeFieldChoices;
  moved: Record<string, number>;
  removedLoyaltyAccounts: MergedLoyaltyAccountSnapshot[];
  /** Campaign participations dropped because both contacts were in the same campaign. */
  droppedCampaignParticipants: { campaignId: string; status: string }[];
  /** Leads left without a contact because the target already had one in that pipeline. */
  detachedLeadIds: string[];
}
