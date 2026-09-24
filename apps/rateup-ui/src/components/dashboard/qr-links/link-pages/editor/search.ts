import { z } from "zod";

export const LINK_PAGE_TABS = ["links", "appearance", "share", "stats"] as const;
export type LinkPageTab = (typeof LINK_PAGE_TABS)[number];

export const linkPageEditorSearchSchema = z.object({
  tab: z.enum(LINK_PAGE_TABS).optional().catch(undefined),
});
