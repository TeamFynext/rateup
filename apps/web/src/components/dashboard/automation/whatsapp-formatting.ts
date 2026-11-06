/**
 * Removes WhatsApp's `*bold*`, `_italic_`, `~strike~` and ```` ```mono``` ```` markers, for the
 * channels that would show them literally. A marker only counts at a word's edge, as WhatsApp
 * reads it, so `snake_case_name` and URLs survive.
 *
 * Mirrors `stripWhatsAppFormatting` in rateup-api's automatedReply utils, which does the same
 * before a rule's reply goes out on Instagram or Messenger.
 */
export function stripWhatsAppFormatting(text: string): string {
  return text
    .replace(/```([\s\S]+?)```/g, "$1")
    .replace(/(^|[\s([{"'])([*_~])(?=\S)([^\n]*?\S)\2(?=$|[\s.,!?:;)\]}"'])/gm, "$1$3");
}
