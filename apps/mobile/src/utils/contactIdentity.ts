import dayjs from "dayjs";

import type {
  ContactIdentity,
  MergeConflict,
  MergeContact,
  MergePreview,
  MergeSide,
  MergeSuggestionReason,
  MergeWarning,
} from "@/api/inbox/contacts/merge.api";

/**
 * Wording for contact identities and merges. Mirrors rateup-ui's
 * `components/Contacts/merge/identity.tsx` and `MergeContactsDialog.tsx`, so the app and
 * the dashboard describe the same contact the same way.
 */

const withPlus = (phone: string) => (phone.startsWith("+") ? phone : `+${phone}`);
const handleOf = (username?: string | null) => (username ? `@${username.replace(/^@/, "")}` : null);

/** What a person reads for an identity. Instagram and Messenger ids are never shown raw. */
export function identityLabel(
  identity: Pick<ContactIdentity, "kind" | "value" | "username" | "displayName">,
): string {
  const handle = handleOf(identity.username);
  switch (identity.kind) {
    case "PHONE":
      return withPlus(identity.value);
    case "EMAIL":
      return identity.value;
    case "WA_BSUID":
      return handle ?? identity.displayName ?? "WhatsApp user";
    case "IG_SCOPED":
      return handle ?? identity.displayName ?? "Instagram user";
    case "FB_PSID":
      return identity.displayName ?? handle ?? "Messenger user";
    case "WEBCHAT":
      return identity.displayName ?? "Web visitor";
    default:
      return identity.value;
  }
}

export function platformName(platform: string | null | undefined): string | null {
  switch (platform?.toUpperCase()) {
    case "WHATSAPP":
      return "WhatsApp";
    case "INSTAGRAM":
      return "Instagram";
    case "FACEBOOK":
    case "MESSENGER":
      return "Messenger";
    case "WEBCHAT":
      return "Web chat";
    default:
      return null;
  }
}

const KIND_NAME: Record<ContactIdentity["kind"], string> = {
  PHONE: "Phone",
  EMAIL: "Email",
  WA_BSUID: "WhatsApp",
  IG_SCOPED: "Instagram",
  FB_PSID: "Messenger",
  WEBCHAT: "Web chat",
  EXTERNAL: "External ID",
};

/** "WhatsApp · Acme Retail": the channel (or business) it was seen on, else its kind. */
export function identityBadge(identity: Pick<ContactIdentity, "kind" | "channel">): string {
  if (identity.kind === "EXTERNAL") return "External ID";
  const channel = identity.channel;
  if (!channel) return KIND_NAME[identity.kind] ?? identity.kind;
  const business =
    channel.whatsapp?.businessPortfolioName || channel.name || handleOf(channel.username);
  return (
    [platformName(channel.platform), business].filter(Boolean).join(" · ") ||
    KIND_NAME[identity.kind]
  );
}

/** A contact's name, or the best handle it has. Never a raw BSUID. */
export function contactName(
  contact:
    | Pick<MergeContact, "name" | "phone" | "email" | "igsId" | "whatsappUserName">
    | null
    | undefined,
): string {
  return (
    contact?.name ||
    contact?.whatsappUserName ||
    (contact?.phone ? withPlus(contact.phone) : null) ||
    contact?.email ||
    (contact?.igsId ? "Instagram user" : null) ||
    "Unnamed contact"
  );
}

/** The phones and emails to tell two contacts apart by. */
export function contactSubtitle(contact: MergeContact): string {
  const parts: string[] = [];
  const add = (value: string | null | undefined) => {
    if (value && !parts.includes(value)) parts.push(value);
  };
  for (const identity of contact.identities ?? []) {
    if (identity.kind === "PHONE") add(withPlus(identity.value));
    else if (identity.kind === "EMAIL") add(identity.value);
  }
  if (contact.phone) add(withPlus(contact.phone));
  add(contact.email);
  return parts.join(" · ");
}

const typedValue = (value: string) => (/^\d{7,15}$/.test(value) ? withPlus(value) : value);

export function suggestionReasonText(
  suggestion: { reason: MergeSuggestionReason; detail?: string | null },
  other: MergeContact | null,
): string {
  switch (suggestion.reason) {
    case "SAME_PHONE":
      return "Same phone";
    case "SAME_EMAIL":
      return "Same email";
    case "BSUID_PHONE_SPLIT":
      return "Same WhatsApp customer";
    case "CUSTOMER_PROVIDED": {
      if (suggestion.detail) {
        return `Typed ${typedValue(suggestion.detail)} in chat, which another contact already has`;
      }
      return `Gave a phone that belongs to ${other ? contactName(other) : "another contact"}`;
    }
    default:
      return "Possible duplicate";
  }
}

export function mergeWarningText(warning: MergeWarning): string {
  switch (warning) {
    case "SPAM_CARRIES_OVER":
      return "One of these contacts is marked as spam. The merged contact will be too.";
    case "BLOCK_CARRIES_OVER":
      return "One of these contacts is blocked. The merged contact stays blocked.";
    case "OPT_OUT_CARRIES_OVER":
      return "One of these contacts has not given marketing consent. The merged contact keeps the stricter setting.";
    case "LOYALTY_ACCOUNT_REMOVED":
      return "Both contacts have a loyalty account in the same programme. The smaller one is closed and its points do not move.";
    case "SHARED_CAMPAIGNS":
      return "Both contacts were in the same campaign. Only one participation is kept.";
    default:
      return warning;
  }
}

export function mergeReasonText(reason: string | null | undefined): string {
  switch (reason) {
    case "HANDOFF":
      return "Matched in chat";
    case "API":
      return "Through the API";
    case "SUGGESTION":
      return "From a suggestion";
    default:
      return "By hand";
  }
}

export function conflictLabel(conflict: MergeConflict): string {
  switch (conflict.field) {
    case "name":
      return "Name";
    case "email":
      return "Email";
    case "address":
      return "Address";
    case "dob":
      return "Birthday";
    case "gender":
      return "Gender";
    case "notes":
      return "Notes";
    case "lifecycleId":
      return "Lifecycle stage";
    default:
      return conflict.label;
  }
}

const toText = (value: unknown): string =>
  typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : JSON.stringify(value);

export function conflictValue(
  conflict: MergeConflict,
  side: MergeSide,
  preview: Pick<MergePreview, "lifecycles">,
): string {
  const value = conflict[side];
  if (value === null || value === undefined || value === "") return "—";
  if (conflict.field === "lifecycleId") {
    return preview.lifecycles.find((l) => l.id === value)?.name ?? toText(value);
  }
  if (conflict.field === "dob") {
    const date = dayjs(toText(value));
    return date.isValid() ? date.format("D MMM YYYY") : toText(value);
  }
  if (Array.isArray(value)) return value.join(", ");
  return toText(value);
}

/** Gender as stored (`MALE`, `FEMALE`, `OTHER`…) to a word. */
export function genderText(gender: string | null | undefined): string | null {
  if (!gender) return null;
  const lower = gender.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * The pair as the merge screen first shows it: the older contact is kept. Swapping is
 * the user's call after that.
 */
export function orientPair(
  a: Pick<MergeContact, "id" | "createdAt">,
  b: Pick<MergeContact, "id" | "createdAt">,
): { sourceId: string; targetId: string } {
  return dayjs(a.createdAt).isBefore(dayjs(b.createdAt))
    ? { sourceId: b.id, targetId: a.id }
    : { sourceId: a.id, targetId: b.id };
}
