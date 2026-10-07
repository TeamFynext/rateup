import { oneOf } from "@/utils/search.ts";

export const LINK_PAGE_TABS = ["links", "appearance", "share", "stats"] as const;
export type LinkPageTab = (typeof LINK_PAGE_TABS)[number];

export function validateLinkPageEditorSearch(search: Record<string, unknown>): {
  tab?: LinkPageTab;
} {
  return { tab: oneOf(LINK_PAGE_TABS, search.tab) };
}
