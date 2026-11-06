// `?tool=` on the Instagram and Messenger pages: which tool the workspace shows. Kept apart
// from the pages so the routes' `validateSearch` does not pull them into the client entry.

export const INSTAGRAM_TOOLS = [
  "comments",
  "stories",
  "persistent-menu",
  "ice-breakers",
  "ig-me-links",
] as const;
export type InstagramTool = (typeof INSTAGRAM_TOOLS)[number];

export const MESSENGER_TOOLS = [
  "comments",
  "m-me-links",
  "welcome",
  "persistent-menu",
  "ice-breakers",
] as const;
export type MessengerTool = (typeof MESSENGER_TOOLS)[number];

/** A `validateSearch` keeping `tool` only when it names one of `tools`; absent means the first. */
export function toolSearch<T extends string>(tools: readonly T[]) {
  return (search: Record<string, unknown>): { tool?: T } => {
    const tool = tools.find((value) => value === search.tool);
    return tool ? { tool } : {};
  };
}
