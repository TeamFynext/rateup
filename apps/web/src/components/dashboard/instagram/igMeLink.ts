/** The ig.me link that opens a DM with the account; `ref` reaches the API as the referral. */
export function igMeLink(username: string | null | undefined, ref?: string): string {
  const handle = (username ?? "").replace(/^@/, "").trim();
  if (!handle) return "";
  const base = `https://ig.me/m/${handle}`;
  return ref?.trim() ? `${base}?ref=${encodeURIComponent(ref.trim())}` : base;
}
