import type { AutomationPlatform } from "@/types/platform.ts";

import demoTemplates from "./demoTemplates.json";

/**
 * Seed flowbot templates shown in the template picker.
 *
 * The data lives in `demoTemplates.json` rather than inline in this module — it is static
 * seed content, not code, and at ~2,000 lines it was the largest file in the tree.
 *
 * The cast narrows `platform` from the `string` that JSON import inference produces back to
 * `AutomationPlatform`. It is safe and local: every entry in the JSON has the literal value
 * "whatsapp", which is `AutomationPlatform.WHATSAPP`.
 */
export const DEMO_TEMPLATES = demoTemplates as Array<
  Omit<(typeof demoTemplates)[number], "platform"> & { platform: AutomationPlatform }
>;
