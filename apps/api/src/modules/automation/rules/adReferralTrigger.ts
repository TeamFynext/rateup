/** The ad a "came from an ad" rule was fired by. */
export interface AdReferralContext {
  sourceId: string;
  headline?: string;
  sourceUrl?: string;
}

export interface AdRuleOptions {
  adIds?: string[];
  adMatch?: string;
}

/**
 * Whether a "came from an ad" rule answers this click. A rule naming neither ads nor words
 * answers every ad; otherwise listing the ad, or a word in its headline or link, is enough.
 */
export function adRuleMatches(
  options: AdRuleOptions | null | undefined,
  ad: AdReferralContext | undefined,
): boolean {
  if (!ad) return false;
  const ids = options?.adIds?.filter(Boolean) ?? [];
  const words = options?.adMatch?.trim().toLowerCase();
  if (!ids.length && !words) return true;
  if (ids.includes(ad.sourceId)) return true;
  if (!words) return false;
  return [ad.headline, ad.sourceUrl].some((text) => text?.toLowerCase().includes(words));
}

/** A rule for particular ads goes before one that answers every ad. */
export const adRuleSpecificity = (options: AdRuleOptions | null | undefined) =>
  Number(Boolean(options?.adIds?.length || options?.adMatch?.trim()));
