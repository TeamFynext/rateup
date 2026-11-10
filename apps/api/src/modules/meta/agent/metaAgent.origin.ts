// Kept free of imports so anything can ask "did Meta AI send this?" without
// pulling in the WhatsApp survey module (and every test mock of it).

/**
 * Whether a send was written by the Meta Business Agent (Meta AI) rather than a
 * person or our own automation. Meta tags the agent's sends — the echo and every
 * status for it — with `biz_opaque_callback_data` of `{"originator":"bizai",…}`.
 */
export function isMetaAiOriginated(bizOpaqueCallbackData: unknown): boolean {
  if (typeof bizOpaqueCallbackData !== "string" || !bizOpaqueCallbackData) return false;
  try {
    const parsed: unknown = JSON.parse(bizOpaqueCallbackData);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as { originator?: unknown }).originator === "bizai"
    );
  } catch {
    return false;
  }
}
