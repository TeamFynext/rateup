import { TemplateType } from "../../../../generated/prisma/client.js";
import { LoyaltyEventType, WaTemplateStatus } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import {
  createTemplate,
  editTemplate,
  fetchTemplate,
  getTemplateByNameAndOrgId,
  saveTemplate,
  updateTemplateInDb,
} from "../../whatsapp/messageTemplates/wa_templates.service.js";
import { LOYALTY_EVENT_TEMPLATE_NAMES, versionedTemplateName } from "../loyaltyEventTemplates.js";
import type { EventTemplateResult } from "../onboarding/onboarding.schema.js";
import {
  buildLoyaltyBodyTemplate,
  loyaltyEventButtons,
  metaStatusToStep,
  saveTriggerBody,
  upsertTrigger,
} from "../onboarding/onboarding.service.js";

/**
 * Saving a notification's text from Messages › Automatic, the way the setup wizard does
 * it: the merchant writes the words, and this turns them into the Meta template the
 * event sends — in one step, without the template editor.
 *
 * The wizard's own step is idempotent by template *name* and ignores a changed body, so
 * this is where an edit is handled. Meta's rules decide how:
 *   - a template Meta has ruled on (approved / rejected / paused) is edited in place and
 *     goes back into review, keeping its name;
 *   - a template still in review cannot be edited, so the new text becomes the next
 *     version (`…_v2`) and the event switches to it; the old one stays in the library;
 *   - a draft that never reached Meta is submitted as is.
 */

interface StoredTemplateData {
  id?: string;
  name?: string;
  status?: string;
  category?: string;
  components?: unknown;
}

interface StoredTemplate {
  id: string;
  whatsappSettingsPhoneId: string | null;
  data: StoredTemplateData;
}

const MAX_VERSIONS = 50;

function bodyTextOf(components: unknown): string | null {
  if (!Array.isArray(components)) return null;
  const body = (components as Array<{ type?: string; text?: string }>).find(
    (component) => String(component?.type ?? "").toUpperCase() === "BODY",
  );
  return body?.text ?? null;
}

function sameText(a: string | null, b: string): boolean {
  return a !== null && a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();
}

function stored(row: {
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

async function setEnabled(programId: string, eventType: LoyaltyEventType, enabled: boolean) {
  await prisma.loyaltyEventTrigger.updateMany({
    where: { programId, eventType },
    data: { enabled },
  });
}

export async function saveEventMessage(input: {
  orgId: string;
  programId: string;
  eventType: LoyaltyEventType;
  body: string;
  enabled?: boolean;
}): Promise<EventTemplateResult> {
  const { orgId, programId, eventType } = input;
  const body = input.body.trim();
  const baseName = LOYALTY_EVENT_TEMPLATE_NAMES[eventType];

  await saveTriggerBody(programId, eventType, body);

  const trigger = await prisma.loyaltyEventTrigger.findFirst({
    where: { programId, eventType },
    include: { waTemplate: true },
  });
  const current = trigger?.waTemplate ? stored(trigger.waTemplate) : null;

  const finish = async (result: EventTemplateResult) => {
    if (input.enabled !== undefined) await setEnabled(programId, eventType, input.enabled);
    return result;
  };

  /* 1. Nothing changed — just make sure the event points at it. */
  if (current && sameText(bodyTextOf(current.data.components), body)) {
    await upsertTrigger(programId, eventType, current.id);
    return finish({
      eventType,
      templateName: current.data.name ?? baseName,
      status: metaStatusToStep(current.data.status),
      templateId: current.id,
      reused: true,
    });
  }

  /* 2. No template yet: a same-text template may already exist under the base name
        (the wizard made it, or another program section did); use it. */
  if (!current) {
    const byName = await getTemplateByNameAndOrgId(baseName, orgId);
    if (byName && sameText(bodyTextOf(byName.data?.components), body)) {
      await upsertTrigger(programId, eventType, byName.id);
      return finish({
        eventType,
        templateName: baseName,
        status: metaStatusToStep(byName.data?.status),
        templateId: byName.id,
        reused: true,
      });
    }
  }

  const phoneId = current?.whatsappSettingsPhoneId ?? undefined;
  const buttons = await loyaltyEventButtons(orgId, eventType);

  /* 3. A draft never reached Meta: submit it under its own row. */
  if (current && (current.data.status === WaTemplateStatus.DRAFT || !current.data.id)) {
    const name = await firstFreeName(orgId, baseName, current.id);
    const submitted = await createTemplate(
      orgId,
      buildLoyaltyBodyTemplate(name, body, buttons),
      phoneId,
    );
    await updateTemplateInDb(
      current.id,
      orgId,
      submitted,
      undefined,
      TemplateType.LOYALTY,
      undefined,
      phoneId,
    );
    await upsertTrigger(programId, eventType, current.id);
    return finish({ eventType, templateName: name, status: "pending", templateId: current.id });
  }

  /* 4. Meta has ruled on it: edit in place, which sends it back into review. */
  if (current && current.data.id && current.data.status !== WaTemplateStatus.PENDING) {
    const name = current.data.name ?? baseName;
    const edited = await editTemplate(
      orgId,
      current.data.id,
      buildLoyaltyBodyTemplate(name, body, buttons).components ?? [],
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
        ...buildLoyaltyBodyTemplate(name, body, buttons),
        id: current.data.id,
        status: WaTemplateStatus.PENDING,
      };
      await updateTemplateInDb(
        current.id,
        orgId,
        next,
        undefined,
        TemplateType.LOYALTY,
        undefined,
        phoneId,
      );
      await upsertTrigger(programId, eventType, current.id);
      return finish({
        eventType,
        templateName: name,
        status: metaStatusToStep(next.status ?? WaTemplateStatus.PENDING),
        templateId: current.id,
        edited: true,
      });
    }
    log.warn(
      { orgId, eventType, templateId: current.id },
      "Meta refused the in-place edit; saving the text as a new version instead",
    );
  }

  /* 5. In review, or the edit was refused: the text becomes the next version. */
  const name = await firstFreeName(orgId, baseName);
  const submitted = await createTemplate(
    orgId,
    buildLoyaltyBodyTemplate(name, body, buttons),
    phoneId,
  );
  const saved = await saveTemplate(submitted, orgId, {}, TemplateType.LOYALTY, undefined, phoneId);
  await upsertTrigger(programId, eventType, saved.id);
  return finish({
    eventType,
    templateName: name,
    status: "pending",
    templateId: saved.id,
    versioned: current !== null,
  });
}
