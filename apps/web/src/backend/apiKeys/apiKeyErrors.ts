import { getAccessDenialReason, getApiErrorMessage } from "@/utils/apiError.ts";

/**
 * Why the API refused to put permissions on a key (rateup-api `src/authz/grant.ts`), or null
 * for any other failure.
 *
 * - `permission`: the key would hold permissions the member does not hold; the API's message
 *   names them.
 * - `scope`: the member is limited to some teams, and a key reaches every team.
 */
export type ApiKeyGrantDenial = { reason: "permission"; detail: string } | { reason: "scope" };

export function getApiKeyGrantDenial(error: unknown): ApiKeyGrantDenial | null {
  const reason = getAccessDenialReason(error);
  if (reason === "scope") return { reason: "scope" };
  if (reason === "permission")
    return { reason: "permission", detail: getApiErrorMessage(error, "") };
  return null;
}

type Translate = (key: string, values?: Record<string, unknown>) => string;

/** The message for a grant refusal, or null when `error` is not one. */
export function apiKeyGrantDenialMessage(error: unknown, t: Translate): string | null {
  const denial = getApiKeyGrantDenial(error);
  if (!denial) return null;
  if (denial.reason === "scope") {
    return t(
      "API keys reach every team, so only members with access to all teams can create or change them.",
    );
  }
  return denial.detail
    ? t("You can only give a key access you have yourself. {detail}", { detail: denial.detail })
    : t("You can only give a key access you have yourself.");
}
