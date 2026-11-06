import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";

import type {
  GetLeadCredential,
  GetLeadStageMapping,
  GetLeadWritePayload,
} from "./getlead.types.js";

/** The Rateup-side fields a GetLead push is built from. */
export interface GetLeadSource {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  /** The board column, for status mapping. */
  stageId?: string;
  stageName?: string;
  /**
   * Where the lead came from. Not sent to GetLead — `source_id` is a ULID from
   * the org's own reference data — but carried so a skip can name the channel
   * responsible. An INSTAGRAM or MESSENGER lead has no phone by construction
   * (see {@link toGetLeadPhone}), and "which channel" is the first thing anyone
   * asks when leads do not appear.
   */
  leadSource?: string | null;
}

/**
 * Converts a stored Rateup phone into the `+E.164` GetLead demands.
 *
 * Rateup stores E.164 with the `+` stripped (`contact.service.ts` does
 * `formattedPhone.slice(1)`), so the common path is a prefix and nothing more —
 * reparsing a value that is already canonical is the step most likely to mangle
 * it. The full parse is the fallback for board leads typed by hand, which are
 * validated by nothing: `lead.schema.ts` types `phone` as a bare
 * `z.string().max(32).nullish()`.
 *
 * Returns null when there is no usable number. GetLead rejects numbers that are
 * merely well-shaped — `+19995550137` is refused as `invalid_phone_number`
 * because `999` is not a dialable area code — so this validates rather than just
 * prefixing.
 *
 * Null is not an edge case. `getOrCreateContactByIgsId` creates Instagram
 * contacts from an `igsId` alone, and Messenger contacts come from a `psid` the
 * same way, so **every lead sourced from a DM has no phone at all**. GetLead
 * requires one, so those leads cannot sync — see the plan's §4.5.
 */
export function toGetLeadPhone(phone?: string | null): string | null {
  const trimmed = phone?.trim();
  if (!trimmed) return null;

  const prefixed = trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
  if (isValidPhoneNumber(prefixed)) return prefixed;

  try {
    const parsed = parsePhoneNumber(trimmed);
    return parsed?.isValid() ? parsed.number : null;
  } catch {
    // Hand-typed board leads reach here — "call the office", an extension, a
    // local number with no country code. Skipped, never fatal.
    return null;
  }
}

/** Which GetLead status a board column maps to, or null when unmapped. */
export function resolveGetLeadStatusId(
  mappings: GetLeadStageMapping[] | undefined,
  stageId?: string,
): string | null {
  if (!stageId || !mappings?.length) return null;
  return mappings.find((m) => m.stageId === stageId)?.getleadStatusId ?? null;
}

/**
 * Builds the create/update body.
 *
 * An unmapped column contributes **no** `status_id` rather than a guess. Zoho's
 * equivalent falls back to the column's own name, which works there because
 * `Lead_Status` is a name; `status_id` is a ULID, so a guess cannot be right and
 * would only earn a 422.
 */
export function buildGetLeadPayload(
  source: GetLeadSource,
  credential: GetLeadCredential,
  phone: string,
): GetLeadWritePayload {
  const statusId =
    resolveGetLeadStatusId(credential.stageMappings, source.stageId) ??
    credential.defaults?.statusId;

  return {
    phone_numbers: [phone],
    ...(source.name && { name: source.name }),
    ...(source.email && { email: source.email }),
    ...(source.notes && { notes: source.notes.slice(0, 1000) }),
    ...(statusId && { status_id: statusId }),
    ...(credential.defaults?.sourceId && { source_id: credential.defaults.sourceId }),
    ...(credential.defaults?.purposeIds?.length && {
      purpose_ids: credential.defaults.purposeIds,
    }),
    ...(credential.defaults?.assignedToId && {
      assigned_to_id: credential.defaults.assignedToId,
    }),
  };
}

export function isGetLeadTriggerEnabled(
  credential: Pick<GetLeadCredential, "triggerSubscriptions"> | null | undefined,
  trigger: string,
) {
  return (credential?.triggerSubscriptions ?? []).some(
    (subscription) => subscription.subscribed_field === trigger && subscription.active === true,
  );
}

/**
 * A display-safe rendering of a stored API key: `ik_••••••••3f2a`.
 *
 * The settings card needs to show that *a* key is stored without handing the
 * browser the secret. The `ik_` prefix and last four characters are enough for
 * an admin to tell one key from another when deciding whether to rotate it, and
 * are not enough to use — GetLead keys are far longer.
 *
 * A key too short to mask (never issued by GetLead, but a hand-edited credential
 * row could hold one) collapses to dots rather than leaking most of itself.
 */
export function maskGetLeadApiKey(apiKey: string | undefined | null) {
  if (!apiKey) return null;

  const prefix = apiKey.startsWith("ik_") ? "ik_" : "";
  const secret = apiKey.slice(prefix.length);
  const dots = "•".repeat(8);

  return secret.length <= 4 ? `${prefix}${dots}` : `${prefix}${dots}${secret.slice(-4)}`;
}
