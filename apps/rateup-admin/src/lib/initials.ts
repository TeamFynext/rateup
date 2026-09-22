let graphemeSegmenter: Intl.Segmenter | null = null;

/**
 * Split into grapheme clusters rather than UTF-16 code units.
 *
 * Contact names really are things like "🧌" or "Bob 🔥" — indexing with `name[0]`
 * hands back one half of a surrogate pair, which renders as "�", and even code
 * points split a ZWJ sequence (👨‍👩‍👧) or a skin-tone modifier mid-emoji.
 */
function graphemesOf(value: string): string[] {
  if (!value) return [];

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    graphemeSegmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(graphemeSegmenter.segment(value), (part) => part.segment);
  }

  // Code points at least keep surrogate pairs together.
  return Array.from(value);
}

/** The first grapheme, whole — a letter, a digit, or an entire emoji. */
function firstGrapheme(value: string): string {
  return graphemesOf(value)[0] ?? "";
}

const isEmoji = (grapheme: string) => /\p{Extended_Pictographic}/u.test(grapheme);
const isLetterOrDigit = (grapheme: string) => /[\p{L}\p{N}]/u.test(grapheme);

/** True when a name leads with an emoji, so an avatar shows it as-is. */
export const isEmojiName = (name: string): boolean => isEmoji(firstGrapheme(name?.trim() ?? ""));

/**
 * Initials for an avatar fallback: the first letter of each word, capped at two.
 *
 * A name that starts with an emoji is returned as that emoji instead — there is
 * nothing to abbreviate, and the emoji *is* how the contact identifies.
 */
export const getInitials = (name: string | null | undefined) => {
  const trimmed = name?.trim();
  if (!trimmed) return "";

  const lead = firstGrapheme(trimmed);
  if (isEmoji(lead)) return lead;

  return trimmed
    .split(/\s+/)
    .map((part) => firstGrapheme(part))
    .filter(isLetterOrDigit)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

/**
 * Initials in first-name + last-name form, for the avatar components.
 *
 * Same emoji handling as {@link getInitials}; only the choice of words differs —
 * "John Ronald Tolkien" is "JT" here and "JR" there.
 */
export const getAvatarInitials = (name: string): string => {
  const trimmed = name?.trim();
  if (!trimmed) return "";

  const lead = firstGrapheme(trimmed);
  if (isEmoji(lead)) return lead;

  const parts = trimmed.split(/\s+/);
  const last = parts.length > 1 ? firstGrapheme(parts.at(-1) ?? "") : "";

  // A trailing emoji ("Bob 🔥") is not an initial — use the first word alone.
  return (lead + (isLetterOrDigit(last) ? last : "")).toUpperCase();
};
