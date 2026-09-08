import type { EventTrigger } from "@/backend/loyalty/eventTriggers.api";
import type { LoyaltyWaCommand } from "@/backend/loyalty/settings/settings.api";
import type { WaTemplateListEntry } from "@/backend/whatsapp/whatsapp.api";

import type { LoyaltyMessageDefinition } from "./loyaltyMessageCatalog.ts";

/** The BODY text of a stored Meta template, with its `{{n}}` tokens still in place. */
export function templateBodyOf(
  entry: Pick<WaTemplateListEntry, "data"> | undefined,
): string | undefined {
  const body = entry?.data?.components?.find(
    (component) => String(component.type).toUpperCase() === "BODY",
  );
  return body?.text;
}

/**
 * A stored template's components, if it carries anything text cannot: buttons, or a media
 * header. Such a template is edited in the template editor, never rewritten inline.
 */
export function templateHasRichParts(
  entry: Pick<WaTemplateListEntry, "data"> | undefined,
): boolean {
  return (entry?.data?.components ?? []).some((component) => {
    const type = String(component.type).toUpperCase();
    if (type === "BUTTONS") return true;
    return type === "HEADER" && String(component.format ?? "TEXT").toUpperCase() !== "TEXT";
  });
}

export interface TemplateUsage {
  kind: "event" | "keyword";
  /** "When points are earned", or the keyword itself for a reply. */
  label: string;
}

/**
 * Which messages point at a template — the events whose trigger sends it and the keyword
 * replies that fall back to it. Empty means the template can be deleted without anything
 * going quiet.
 */
export function usageOf(
  templateId: string,
  triggers: readonly EventTrigger[],
  commands: readonly LoyaltyWaCommand[],
  catalog: readonly LoyaltyMessageDefinition[],
): TemplateUsage[] {
  const out: TemplateUsage[] = [];
  for (const trigger of triggers) {
    if (trigger.waTemplateId !== templateId) continue;
    const definition = catalog.find(
      (entry) => entry.kind === "event" && entry.eventType === trigger.eventType,
    );
    out.push({ kind: "event", label: definition?.label ?? trigger.eventType });
  }
  for (const command of commands) {
    if (command.waTemplateId !== templateId) continue;
    out.push({ kind: "keyword", label: command.requestMessage ?? command.type });
  }
  return out;
}

/** Every template id something points at, for a quick "in use" check per row. */
export function usedTemplateIds(
  triggers: readonly EventTrigger[],
  commands: readonly LoyaltyWaCommand[],
): Set<string> {
  const ids = new Set<string>();
  for (const trigger of triggers) if (trigger.waTemplateId) ids.add(trigger.waTemplateId);
  for (const command of commands) if (command.waTemplateId) ids.add(command.waTemplateId);
  return ids;
}
