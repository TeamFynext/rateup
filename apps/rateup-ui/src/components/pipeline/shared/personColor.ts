/**
 * Teammate monogram colours, owned by the pipeline.
 *
 * People are told apart at a glance by colour, so their avatar is filled rather
 * than tinted. These five are the RateUp palette's own accents — brand blue,
 * the logo's warm amber, ink, the cyan highlight and success green — all dark
 * enough to carry white text in either theme, which is why they need no `dark:`
 * variant. Org-brand hex like this is the one case the styling rules allow, and
 * only as a dynamic value, the same way stage and label colours work.
 */
const PERSON_COLORS = [
  "#1C518E", // brand blue
  "#D97A0F", // warm
  "#4A4C49", // ink
  "#1E86E6", // cyan
  "#16A34A", // success
] as const;

/**
 * Picks a person's colour from `key` — their user id where the caller has it,
 * so the same teammate keeps one colour across every view, even when their name
 * is missing or later changes.
 */
export function personColor(key: string): string {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash += key.charCodeAt(index);
  return PERSON_COLORS[hash % PERSON_COLORS.length];
}
