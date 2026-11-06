/** The m.me link that opens a Messenger chat with the Page; `ref` reaches the API as the referral. */
export function mMeLink(pageId: string | null | undefined, ref?: string): string {
  const page = (pageId ?? "").trim();
  if (!page) return "";
  const base = `https://m.me/${page}`;
  return ref?.trim() ? `${base}?ref=${encodeURIComponent(ref.trim())}` : base;
}
