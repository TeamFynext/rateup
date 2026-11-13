import { TemplateType } from "../../../generated/prisma/client.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import prisma from "../../../utils/prisma.js";
import {
  storedTemplate,
  submitTextTemplate,
} from "../../meta/whatsapp/templates/textTemplate.service.js";
import { LOYALTY_EVENT_TEMPLATE_NAMES } from "../loyaltyEventTemplates.js";
import type { EventTemplateResult } from "../onboarding/onboarding.schema.js";
import {
  loyaltyEventButtons,
  saveTriggerBody,
  upsertTrigger,
} from "../onboarding/onboarding.service.js";

/**
 * Saving a notification's text from Messages › Automatic, the way the setup wizard does
 * it: the merchant writes the words, and this turns them into the Meta template the
 * event sends — in one step, without the template editor.
 *
 * The wizard's own step is idempotent by template *name* and ignores a changed body, so
 * this is where an edit is handled. How an edit reaches Meta (in place, as a new version,
 * or a draft submitted) is `submitTextTemplate`'s, shared with the shop's order updates.
 */

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

  await saveTriggerBody(programId, eventType, body);

  const trigger = await prisma.loyaltyEventTrigger.findFirst({
    where: { programId, eventType },
    include: { waTemplate: true },
  });
  const current = trigger?.waTemplate ? storedTemplate(trigger.waTemplate) : null;

  const result = await submitTextTemplate({
    orgId,
    baseName: LOYALTY_EVENT_TEMPLATE_NAMES[eventType],
    body,
    current,
    buttons: await loyaltyEventButtons(orgId, eventType),
    templateType: TemplateType.LOYALTY,
  });
  await upsertTrigger(programId, eventType, result.templateId);
  if (input.enabled !== undefined) await setEnabled(programId, eventType, input.enabled);
  return { eventType, ...result };
}
