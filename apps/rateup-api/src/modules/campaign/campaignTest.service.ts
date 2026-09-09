import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { CampaignNotFoundError } from "./campaign.errors.js";
import { buildTemplateComponents } from "../whatsapp/messageTemplates/templateComponents.js";
import { getDbTemplate } from "../whatsapp/messageTemplates/wa_templates.service.js";
import { createTemplateMessage } from "../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { sendMetaMessage } from "../whatsapp/meta/metaMessage.service.js";
import { PlatformType } from "../../../generated/prisma/enums.js";

export class CampaignTestSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignTestSendError";
  }
}

/**
 * Send the campaign's template to one number, as a rehearsal.
 *
 * Deliberately *not* a campaign send: it opens no `CampaignSend`, touches no
 * participant, and moves no counter. A test that showed up in the attempts table
 * would corrupt the numbers the whole analytics tab is built on, and a test that
 * created a participant would then be sent to again for real.
 *
 * It is still a real message to a real person, so it is billed and gated like
 * any other: `sendMetaMessage` enforces the org's conversation allowance.
 */
export async function sendCampaignTestMessage(
  campaignId: string,
  orgId: string,
  phone: string,
): Promise<{ messageId?: string }> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, team: { orgId } },
    select: { id: true, teamId: true, waTemplateId: true, dynamicTags: true },
  });
  if (!campaign) throw new CampaignNotFoundError();

  if (!campaign.waTemplateId) {
    throw new CampaignTestSendError("Choose a template before sending a test.");
  }

  const dbTemplate = await getDbTemplate(campaign.waTemplateId, orgId);
  if (!dbTemplate) throw new CampaignTestSendError("The campaign's template no longer exists.");

  const recipient = phone.replace(/[^\d+]/g, "");

  // Rendered with the same builder the real send uses, so a test exercises the
  // actual header, body and buttons rather than an approximation of them. The
  // flow button is left out: a test send has no participant for a flow response
  // to be filed against.
  const components = await buildTemplateComponents({
    dbTemplate: {
      data: dbTemplate.data,
      defaultValues: dbTemplate.defaultValues,
      whatsappSettingsPhoneId: dbTemplate.whatsappSettingsPhoneId,
    },
    orgId,
    phone: recipient,
    teamId: campaign.teamId,
    includeFlowButton: false,
  });

  const result = await sendMetaMessage({
    platform: PlatformType.WHATSAPP,
    orgId,
    to: recipient,
    payload: createTemplateMessage(recipient, {
      name: dbTemplate.data.name,
      language: { code: dbTemplate.data.language },
      components,
    }) as unknown as Record<string, unknown>,
    category: dbTemplate.data.category,
    teamId: campaign.teamId,
    messageType: "TEMPLATE",
  });

  if (!result.ok) {
    log.warn({ campaignId, orgId, error: result.error }, "Campaign test send rejected");
    throw new CampaignTestSendError(result.error ?? "Meta rejected the test message.");
  }

  return { messageId: result.messageId };
}
