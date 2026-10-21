import { z } from "zod";

import type { SubscriptionFeatures } from "@/api/org-actions.api";
import type { ResumeIntent } from "@/lib/resume";

import type { OrgAction } from "./org-action-dialogs";

/*
 * The org actions the API guards with a fresh Google sign-in (rateup-api
 * staff.privileged.ts): subscription plan, expiry and overrides, add-on packs, suspension.
 * A REAUTH_REQUIRED sends the staff member to Google; these turn the open dialog into a
 * ResumeIntent and back, so the org page reopens it with the fields as they were left.
 */

export type StepUpOrgAction = Extract<
  OrgAction,
  { kind: "plan" | "expiry" | "limits" | "grant-packs" | "revoke-pack" | "suspend" | "unsuspend" }
>;

const PREFIX = "org-action:";

export const ORG_ACTION_RESUME_KINDS: readonly string[] = [
  "plan",
  "expiry",
  "limits",
  "grant-packs",
  "revoke-pack",
  "suspend",
  "unsuspend",
].map((kind) => PREFIX + kind);

export const orgPagePath = (orgId: string) => `/orgs/${orgId}`;

const revokeDraft = z.object({ label: z.string() });

/** What to remember for `action` if the API asks for a fresh sign-in. */
export function orgActionStepUp(
  orgId: string,
  action: StepUpOrgAction,
  draft?: unknown,
): Omit<ResumeIntent, "reason"> {
  return {
    path: orgPagePath(orgId),
    kind: PREFIX + action.kind,
    id: action.kind === "revoke-pack" ? action.addonId : orgId,
    draft:
      action.kind === "revoke-pack"
        ? ({ label: action.label } satisfies z.infer<typeof revokeDraft>)
        : draft,
  };
}

/** The dialog to reopen for an intent stored by `orgActionStepUp`, or null. */
export function orgActionFromIntent(intent: ResumeIntent | null): StepUpOrgAction | null {
  if (!intent?.kind.startsWith(PREFIX)) return null;
  const kind = intent.kind.slice(PREFIX.length);
  switch (kind) {
    case "plan":
    case "expiry":
    case "limits":
    case "grant-packs":
    case "suspend":
    case "unsuspend":
      return { kind };
    case "revoke-pack": {
      const draft = revokeDraft.safeParse(intent.draft);
      return draft.success ? { kind, addonId: intent.id, label: draft.data.label } : null;
    }
    default:
      return null;
  }
}

/** Each dialog's saved fields, checked on the way back in. */
export const planDraft = z.object({
  planId: z.string(),
  expiry: z.string(),
  keepCaps: z.boolean(),
});
export const expiryDraft = z.object({ expiry: z.string() });
export const grantPacksDraft = z.object({
  kind: z.enum(["ACTIVE_CONTACTS", "CAMPAIGN_CREDITS"]),
  quantity: z.number().int().min(1).max(20),
});
const limitsDraftSchema = z.object({ features: z.record(z.string(), z.unknown()) });

/** The saved fields of `kind`'s dialog when `intent` is for it, else null. */
export function readDraft<T>(
  intent: ResumeIntent | null | undefined,
  kind: StepUpOrgAction["kind"],
  schema: z.ZodType<T>,
): T | null {
  if (intent?.kind !== PREFIX + kind) return null;
  const parsed = schema.safeParse(intent.draft);
  return parsed.success ? parsed.data : null;
}

/**
 * The limits editor's saved draft. It is only shape-checked at the top: `completeFeatures`
 * fills in or defaults anything missing below that.
 */
export function readLimitsDraft(
  intent: ResumeIntent | null | undefined,
): Partial<SubscriptionFeatures> | null {
  const draft = readDraft(intent, "limits", limitsDraftSchema);
  return draft ? (draft.features as Partial<SubscriptionFeatures>) : null;
}
