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

/**
 * Which of a starter's template names this is, if any: `loyalty_birthday` is version 1,
 * `loyalty_birthday_v2` version 2, and so on. The API versions a name forward
 * (`versionedTemplateName`) whenever Meta will not take an edit in place, so a message's
 * template is a small family rather than one fixed name.
 */
export function starterTemplateVersion(baseName: string, name: string | undefined): number | null {
  if (!name || !name.startsWith(baseName)) return null;
  const suffix = name.slice(baseName.length);
  if (suffix === "") return 1;
  const match = /^_v(\d+)$/.exec(suffix);
  return match ? Number(match[1]) : null;
}

/**
 * The newest template a starter has already produced, whatever its status — including a
 * draft saved in the editor and never submitted.
 *
 * An event's own trigger is the first place to look for its template; this is the second.
 * A template created in the WhatsApp editor cannot write itself back onto the trigger (the
 * create and save-as-draft endpoints answer without an id), so without this the message
 * still reads as "not written" and offers to make the template a second time.
 */
export function findStarterTemplate(
  templates: readonly WaTemplateListEntry[],
  baseName: string,
): WaTemplateListEntry | undefined {
  const matches: Array<{ entry: WaTemplateListEntry; version: number }> = [];
  for (const entry of templates) {
    const version = starterTemplateVersion(baseName, entry.data?.name);
    if (version !== null) matches.push({ entry, version });
  }
  matches.sort(
    (a, b) => b.version - a.version || b.entry.createdAt.localeCompare(a.entry.createdAt),
  );
  return matches[0]?.entry;
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
