import crypto from "crypto";
import { parsePhoneNumber } from "libphonenumber-js";

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { getScheduleTime } from "../../../utils/date.js";
import { shopifySurveyQueue } from "../../../workers/bullmq/queues/index.js";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller.js";
import type {
  CommerceOrder,
  CommerceProvider,
  CommerceStore,
  CommerceSurvey,
  CommerceSurveySchedule,
} from "./commerce.types.js";

/**
 * WhatsApp surveys on store order events: scheduling one when an order event
 * arrives, and sending it when its delayed job comes due.
 *
 * Surveys and their schedules live in the integration's credential, under the
 * provider's `surveysField` (`shopifySurveys` for Shopify, as they always have).
 * Lifted from the Shopify service unchanged in behaviour.
 */

/** The job on the survey queue — the queue Shopify's surveys have always used. */
export interface OrderSurveyJobData {
  orgId: string;
  integrationId: string;
  event: string;
  scheduleId: string;
}

type TemplateParameters = { type: string; parameters: { type: string; text: string }[] }[];

/**
 * A template's body parameters from the survey's variable mapping, resolved
 * against the stored payload. Every index up to the highest mapped one is
 * filled, with an empty string for any gap, because WhatsApp rejects a
 * template whose parameters skip a position.
 */
export function buildSurveyTemplateParameters(
  survey: Pick<CommerceSurvey, "variableMapping">,
  body: Record<string, unknown> | null | undefined,
  resolve: (raw: Record<string, unknown> | null | undefined, path: string) => string,
): TemplateParameters {
  if (!survey.variableMapping || !body) return [];

  const sorted = [...survey.variableMapping].sort(
    (a, b) => a.templateParamIndex - b.templateParamIndex,
  );
  const maxIndex = Math.max(...sorted.map((m) => m.templateParamIndex), -1);
  if (maxIndex === -1) return [];

  const parameters: { type: string; text: string }[] = [];
  for (let i = 0; i <= maxIndex; i++) {
    const mapping = sorted.find((m) => m.templateParamIndex === i);
    const path = mapping?.path ?? mapping?.shopifyPath;
    const value = path ? resolve(body, path) : "";
    parameters.push({ type: "text", text: String(value ?? "") });
  }
  return [{ type: "body", parameters }];
}

function surveysOf(integration: { credential: unknown }, provider: CommerceProvider) {
  const credential = (integration.credential ?? {}) as Record<string, unknown>;
  return credential[provider.surveysField] as CommerceSurvey[] | undefined;
}

/**
 * Schedules the survey configured for this order event, if there is one, and
 * queues its send.
 */
export async function scheduleOrderSurvey(
  store: CommerceStore,
  order: CommerceOrder,
  customerPhone: string,
  scheduleFromDate = new Date(),
) {
  const { provider, integration } = store;
  log.info("Checking survey for %s event %o", provider.label, {
    event: order.eventKey,
    webhookId: order.deliveryId,
    customerPhone,
  });

  const phone = parsePhoneNumber(customerPhone, "IN");
  if (phone.isValid() === false) {
    log.trace("Invalid phone number");
    return;
  }

  const surveys = surveysOf(integration, provider) ?? [];
  const survey = surveys.find((s) => s.event === order.eventKey);
  if (!survey || !survey.active) {
    log.trace(`No Survey schedule found`);
    return;
  }

  const webhookId = order.deliveryId;
  if (webhookId && survey.schedules?.some((s) => s.webhookId === webhookId)) {
    log.trace(`Duplicate webhook event for ${webhookId}. Skipping...`);
    return;
  }

  if (
    survey.isProductSpecific &&
    (!survey.productId || !order.productIds.includes(survey.productId))
  ) {
    log.trace(`Specified product is not in the list`);
    return;
  }

  const phoneWithoutPlus = phone.countryCallingCode + phone.nationalNumber;
  if (!phoneWithoutPlus) {
    log.trace(`No customer phone number found`);
    return;
  }

  const scheduleId = crypto.randomUUID();
  const scheduledTime = getScheduleTime(survey.timeDelay, scheduleFromDate);
  const scheduleObj = {
    scheduleId,
    scheduledAt: scheduledTime,
    createdAt: new Date(),
    status: survey.waTemplateId ? "SCHEDULED" : null,
  };
  const schedules: CommerceSurveySchedule[] = [
    ...(survey.schedules || []),
    {
      ...scheduleObj,
      phone: phoneWithoutPlus,
      webhookId,
      actionStatus: null,
      history: [scheduleObj],
      apiStatus: null,
      body: order.raw,
    },
  ];
  survey.schedules = schedules;
  const updated = surveys.map((s) => (s.event === survey.event ? { ...s, schedules } : s));
  await provider.saveSurveys(store, updated);

  if (survey.waTemplateId) {
    const delayMs = Math.max(0, scheduledTime.getTime() - Date.now());
    await shopifySurveyQueue.add(
      "process-survey",
      {
        orgId: store.orgId,
        integrationId: integration.id,
        event: survey.event,
        scheduleId,
      } satisfies OrderSurveyJobData,
      { delay: delayMs, jobId: scheduleId },
    );
    log.info(`Enqueued ${provider.label} survey ${scheduleId} to send in ${delayMs}ms`);
  }
}

/**
 * Sends one scheduled survey, when its delayed job comes due, and records the
 * outcome on the schedule.
 *
 * Re-reads the integration rather than trusting the job: the survey may have
 * been switched off, or the schedule already handled, since it was queued.
 */
export async function processOrderSurveySchedule(
  jobData: OrderSurveyJobData,
  getProvider: (name: string) => CommerceProvider | undefined,
) {
  const { orgId, integrationId, event, scheduleId } = jobData;

  const integration = await prisma.integration.findUnique({ where: { id: integrationId } });
  if (!integration) {
    log.error(`Integration ${integrationId} not found for schedule ${scheduleId}`);
    return;
  }
  const provider = getProvider(integration.name);
  if (!provider) {
    log.error(`No commerce provider ${integration.name} for schedule ${scheduleId}`);
    return;
  }

  const surveys = surveysOf(integration, provider);
  if (!surveys || !surveys.length) {
    log.trace("No surveys found");
    return;
  }

  const surveyIndex = surveys.findIndex((s) => s.event === event);
  if (surveyIndex === -1) {
    log.trace(`Survey for event ${event} not found`);
    return;
  }

  const survey = surveys[surveyIndex];
  if (!survey.active || !survey.schedules) {
    log.trace(`Survey ${event} not active or no schedules`);
    return;
  }

  const scheduleIndex = survey.schedules.findIndex((s) => s.scheduleId === scheduleId);
  if (scheduleIndex === -1) {
    log.trace(`Schedule ${scheduleId} not found in survey ${event} `);
    return;
  }

  const sch = survey.schedules[scheduleIndex];
  if (sch.status !== "SCHEDULED") {
    log.info(`Schedule ${scheduleId} is already processed with status ${sch.status}.Skipping.`);
    return;
  }

  const markHistory = (update: Partial<CommerceSurveySchedule["history"][number]>) => {
    sch.history.forEach((h) => {
      if (h.scheduleId === sch.scheduleId || h.scheduledAt === sch.scheduledAt) {
        Object.assign(h, update);
      }
    });
  };

  try {
    const parameters = buildSurveyTemplateParameters(survey, sch.body, (raw, path) =>
      provider.resolveTemplateValue(raw, path),
    );
    const res = await sendTemplateToUserCore(
      orgId,
      survey.waTemplateId ?? "",
      sch.phone,
      parameters,
      survey.teamId,
    );
    // No timeDelay is passed, so only the `message` shape of the union return
    // can come back at runtime.
    if ("message" in res) {
      sch.status = res.status ? "SENT" : `FAILED: ${res.message} `;
      let messageSentAt = new Date();
      if (res.status) {
        const message = await prisma.waMessage.findFirst({ where: { messageId: res.message } });
        messageSentAt = message?.waCreatedAt || new Date();
      }
      sch.sentAt = messageSentAt;
      markHistory({ status: sch.status, sentAt: messageSentAt });
    }

    log.info(`Successfully processed schedule ${scheduleId}: status ${sch.status} `);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    log.error({ err: e }, `Error sending template for schedule ${scheduleId}`);
    sch.status = `FAILED: ${errorMessage} `;
    markHistory({ status: sch.status });
  }

  survey.schedules[scheduleIndex] = sch;
  surveys[surveyIndex] = survey;

  try {
    await provider.saveSurveys({ orgId, integration }, surveys);
  } catch (e) {
    log.error({ e }, `error updating ${provider.label} integration for orgId => ${orgId}`);
  }
}
