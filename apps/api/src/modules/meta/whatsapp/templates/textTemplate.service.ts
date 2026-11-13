import type { TemplateType } from "../../../../generated/prisma/client.js";
import {
  WaTemplateCategory,
  WaTemplateComponentTypeUpperCase,
  WaTemplateStatus,
} from "../../../../types/enums.js";
import type { WaTemplateButton } from "../../../../types/whatsapp.types.js";
import { log } from "../../../../utils/logger.js";
import {
  createTemplate,
  editTemplate,
  fetchTemplate,
  getTemplateByNameAndOrgId,
  saveTemplate,
  updateTemplateInDb,
} from "./templates.service.js";

/**
 * Turning a merchant's words into the Meta template an automatic message sends, in one
 * step, without the template editor. Loyalty's automatic messages and the shop's order
 * updates both save their text through here; each keeps its own record of which template
 * the message points at.
 *
 * Meta's rules decide how an edit lands:
 *   - a template Meta has ruled on (approved / rejected / paused) is edited in place and
 *     goes back into review, keeping its name;
 *   - a template still in review cannot be edited, so the new text becomes the next
 *     version (`…_v2`) and the message switches to it; the old one stays in the library;
 *   - a draft that never reached Meta is submitted as is.
 */

export interface StoredTemplateData {
  id?: string;
  name?: string;
  status?: string;
  category?: string;
  components?: unknown;
}

export interface StoredTemplate {
  id: string;
  whatsappSettingsPhoneId: string | null;
  data: StoredTemplateData;
}

export type TextTemplateStatus = "pending" | "approved" | "rejected";

export interface TextTemplateResult {
  templateId: string;
  templateName: string;
  status: TextTemplateStatus;
  reused?: boolean;
  edited?: boolean;
  versioned?: boolean;
}

const MAX_VERSIONS = 50;

/**
 * `loyalty_points_issued` → `loyalty_points_issued_v2`, `_v3`, … An edit Meta will not
 * take in place (the template is mid-review) becomes a new template under the next free
 * suffix, and the base name stays recognisable in the library.
 */
export function versionedTemplateName(baseName: string, version: number): string {
  return version <= 1 ? baseName : `${baseName}_v${version}`;
}

/** Whether a template's name is `baseName` or one of its `_vN` versions. */
export function isVersionOf(name: string | undefined, baseName: string): boolean {
  return !!name && (name === baseName || new RegExp(`^${baseName}_v\\d+$`).test(name));
}

export function metaStatusToStep(status: unknown): TextTemplateStatus {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

function countPlaceholders(body: string): number {
  const matches = body.match(/\{\{(\d+)\}\}/g);
  if (!matches) return 0;
  return new Set(matches).size;
}

/**
 * A UTILITY template of one body, plus buttons. Meta rejects a body with variables unless
 * it is given a sample for each one; `examples` supplies realistic ones, which review
 * takes better than "Sample 1".
 */
export function buildBodyTemplate(
  templateName: string,
  body: string,
  buttons: WaTemplateButton[] = [],
  examples?: readonly string[],
): WaMetaTemplate {
  const placeholderCount = countPlaceholders(body);
  return {
    name: templateName,
    language: "en",
    category: WaTemplateCategory.UTILITY,
    components: [
      {
        type: WaTemplateComponentTypeUpperCase.BODY,
        text: body,
        ...(placeholderCount > 0
          ? {
              example: {
                body_text: [
                  Array.from(
                    { length: placeholderCount },
                    (_, i) => examples?.[i] || `Sample ${i + 1}`,
                  ),
                ],
              },
            }
          : {}),
      },
      ...(buttons.length > 0 ? [{ type: WaTemplateComponentTypeUpperCase.BUTTONS, buttons }] : []),
    ],
  };
}

export function bodyTextOf(components: unknown): string | null {
  if (!Array.isArray(components)) return null;
  const body = (components as Array<{ type?: string; text?: string }>).find(
    (component) => String(component?.type ?? "").toUpperCase() === "BODY",
  );
  return body?.text ?? null;
}

function sameText(a: string | null, b: string): boolean {
  return a !== null && a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();
}

export function storedTemplate(row: {
  id: string;
  whatsappSettingsPhoneId: string | null;
  data: unknown;
}): StoredTemplate {
  return {
    id: row.id,
    whatsappSettingsPhoneId: row.whatsappSettingsPhoneId,
    data: (row.data ?? {}) as StoredTemplateData,
  };
}

/** The first `base`, `base_v2`, `base_v3` … that no other template of the org uses. */
async function firstFreeName(orgId: string, baseName: string, ownId?: string): Promise<string> {
  for (let version = 1; version <= MAX_VERSIONS; version++) {
    const name = versionedTemplateName(baseName, version);
    const taken = await getTemplateByNameAndOrgId(name, orgId);
    if (!taken || taken.id === ownId) return name;
  }
  throw new Error(`No free template name left for ${baseName}`);
}

/**
 * Makes sure an approved-or-pending template carries `body`, and says which one. The caller
 * then points its message at `templateId`.
 *
 * `current` is the template the message points at now, or null. A caller passes only a
 * template it owns: one it would be wrong to edit in place (shared by other messages)
 * should be left out, and a new one is made instead.
 */
export async function submitTextTemplate(input: {
  orgId: string;
  baseName: string;
  body: string;
  current: StoredTemplate | null;
  buttons?: WaTemplateButton[];
  examples?: readonly string[];
  templateType: TemplateType;
}): Promise<TextTemplateResult> {
  const { orgId, baseName, current, templateType } = input;
  const body = input.body.trim();
  const buttons = input.buttons ?? [];
  const build = (name: string) => buildBodyTemplate(name, body, buttons, input.examples);

  /* 1. Nothing changed: keep pointing at it. */
  if (current && sameText(bodyTextOf(current.data.components), body)) {
    return {
      templateName: current.data.name ?? baseName,
      status: metaStatusToStep(current.data.status),
      templateId: current.id,
      reused: true,
    };
  }

  /* 2. No template yet: a same-text template may already exist under the base name. */
  if (!current) {
    const byName = await getTemplateByNameAndOrgId(baseName, orgId);
    if (byName && sameText(bodyTextOf(byName.data?.components), body)) {
      return {
        templateName: baseName,
        status: metaStatusToStep(byName.data?.status),
        templateId: byName.id,
        reused: true,
      };
    }
  }

  const phoneId = current?.whatsappSettingsPhoneId ?? undefined;

  /* 3. A draft never reached Meta: submit it under its own row. */
  if (current && (current.data.status === WaTemplateStatus.DRAFT || !current.data.id)) {
    const name = await firstFreeName(orgId, baseName, current.id);
    const submitted = await createTemplate(orgId, build(name), phoneId);
    await updateTemplateInDb(
      current.id,
      orgId,
      submitted,
      undefined,
      templateType,
      undefined,
      phoneId,
    );
    return { templateName: name, status: "pending", templateId: current.id };
  }

  /* 4. Meta has ruled on it: edit in place, which sends it back into review. */
  if (current && current.data.id && current.data.status !== WaTemplateStatus.PENDING) {
    const name = current.data.name ?? baseName;
    const edited = await editTemplate(
      orgId,
      current.data.id,
      build(name).components ?? [],
      current.data.category ?? "UTILITY",
      phoneId,
    );
    if (edited) {
      // Meta's read-back carries the new status; fall back to the local text if the
      // fetch fails, so the library never shows the old words after a successful edit.
      const refreshed = (await fetchTemplate(name, orgId, phoneId)) as
        | (WaMetaTemplate & { status?: string })
        | undefined;
      const next: WaMetaTemplate = refreshed ?? {
        ...build(name),
        id: current.data.id,
        status: WaTemplateStatus.PENDING,
      };
      await updateTemplateInDb(
        current.id,
        orgId,
        next,
        undefined,
        templateType,
        undefined,
        phoneId,
      );
      return {
        templateName: name,
        status: metaStatusToStep(next.status ?? WaTemplateStatus.PENDING),
        templateId: current.id,
        edited: true,
      };
    }
    log.warn(
      { orgId, baseName, templateId: current.id },
      "Meta refused the in-place edit; saving the text as a new version instead",
    );
  }

  /* 5. In review, or the edit was refused: the text becomes the next version. */
  const name = await firstFreeName(orgId, baseName);
  const submitted = await createTemplate(orgId, build(name), phoneId);
  const saved = await saveTemplate(submitted, orgId, {}, templateType, undefined, phoneId);
  return {
    templateName: name,
    status: "pending",
    templateId: saved.id,
    versioned: current !== null,
  };
}
