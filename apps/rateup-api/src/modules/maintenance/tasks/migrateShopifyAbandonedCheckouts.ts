import { Prisma, TriggerEvent } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { IntegratedApps, ShopifyEvents } from "../../../types/enums.js";
import shopify from "../../integrations/shopify/shopify.config.js";
import { defaultWebhookHandlers } from "../../integrations/shopify/shopify.handler.js";
import { getActiveShopifySession } from "../../integrations/shopify/shopify.session.js";
import {
  getManagableWebhooks,
  registerShopifyWebhook,
} from "../../integrations/shopify/shopify.webhooks.js";
import {
  DEFAULT_ABANDONED_DELAY_MINUTES,
  MAX_ABANDONED_DELAY_MINUTES,
  MIN_ABANDONED_DELAY_MINUTES,
} from "../../integrations/shopify/abandonedCheckout.constants.js";
import type { TaskContext, TaskOutcome } from "../task.js";

const clampDelay = (minutes: number) =>
  Math.min(MAX_ABANDONED_DELAY_MINUTES, Math.max(MIN_ABANDONED_DELAY_MINUTES, minutes));

function repeatMinutes(repeat: ShopifySurvey["repeatInterval"] | undefined) {
  if (!repeat?.value) return 0;
  return repeat.value * (repeat.unit === "day" ? 24 * 60 : 60);
}

/**
 * Moves every shop onto webhook-driven abandoned-checkout reminders.
 *
 * Per active Shopify integration it subscribes the shop to the per-shop topics it lacks
 * (the checkouts/* ones are new), then turns a legacy abandoned-checkout template setting
 * into an "On abandoned checkouts" rule — plus a follow-up rule for a repeat interval,
 * which the legacy sender repeated forever and the rule sends once — and switches the
 * legacy setting off. Migrated rules keep the legacy behaviour of messaging every buyer
 * with a phone, so they do not require marketing consent. Safe to re-run: an existing rule
 * of the same name is left alone and a switched-off setting is skipped.
 */
export async function migrateShopifyAbandonedCheckouts({
  apply,
  log,
}: TaskContext): Promise<TaskOutcome> {
  if (!shopify)
    throw new Error("SHOPIFY_API_KEY, SHOPIFY_API_SECRET and SHOPIFY_SCOPES must be set");

  const integrations = (await prisma.integration.findMany({
    where: { name: IntegratedApps.shopify, active: true },
  })) as unknown as ShopifyIntegration[];

  let shopsNeedingTopics = 0;
  let subscribeFailures = 0;
  let rules = 0;
  let settingsSwitchedOff = 0;

  for (const integration of integrations) {
    const shop = integration.credential?.session?.shop;
    if (!shop) continue;
    const { orgId } = integration;

    try {
      const session = await getActiveShopifySession(integration);
      const client = new shopify.clients.Graphql({ session });
      const registered = new Set((await getManagableWebhooks(client)).map((w) => w.topic));
      const missing = Object.keys(defaultWebhookHandlers).filter((t) => !registered.has(t));
      if (missing.length) {
        shopsNeedingTopics++;
        if (apply) await registerShopifyWebhook(session);
        log(`${shop}: ${apply ? "subscribed to" : "would subscribe to"} ${missing.join(", ")}`);
      }
    } catch (err) {
      subscribeFailures++;
      log(`${shop}: webhook subscription failed — ${err instanceof Error ? err.message : err}`);
    }

    const surveys = integration.credential.shopifySurveys ?? [];
    const legacy = surveys.find(
      (s) => s.event === ShopifyEvents.ABANDONED_CHECKOUTS && s.active && s.waTemplateId,
    );
    if (!legacy?.waTemplateId) continue;

    const template = await prisma.waTemplate.findFirst({
      where: { id: legacy.waTemplateId },
      select: { whatsappSettingsPhoneId: true },
    });
    const delay = clampDelay(legacy.timeDelay || DEFAULT_ABANDONED_DELAY_MINUTES);
    const steps = [{ name: "Abandoned checkout reminder", delay }];
    const repeat = repeatMinutes(legacy.repeatInterval);
    if (repeat) {
      steps.push({ name: "Abandoned checkout follow-up", delay: clampDelay(delay + repeat) });
    }

    for (const step of steps) {
      const exists = await prisma.rule.findUnique({
        where: { rule_name_org_id_unique: { name: step.name, orgId } },
        select: { id: true },
      });
      if (exists) {
        log(`${shop}: rule "${step.name}" already exists, left alone`);
        continue;
      }
      rules++;
      log(
        `${shop}: ${apply ? "created" : "would create"} rule "${step.name}" (after ${step.delay} min)`,
      );
      if (!apply) continue;
      await prisma.rule.create({
        data: {
          orgId,
          name: step.name,
          triggerEvent: TriggerEvent.SHOPIFY_EVENT,
          whatsappSettingsPhoneIds: template?.whatsappSettingsPhoneId
            ? [template.whatsappSettingsPhoneId]
            : [],
          options: {
            shopifyEvent: ShopifyEvents.ABANDONED_CHECKOUTS,
            abandonedCheckoutDelayMinutes: step.delay,
            requireMarketingConsent: false,
          },
          actions: {
            create: {
              type: "SEND_TEMPLATE",
              value: {
                templateId: legacy.waTemplateId,
                variableMapping: legacy.variableMapping ?? [],
              } as Prisma.InputJsonValue,
            },
          },
        },
      });
    }

    settingsSwitchedOff++;
    log(
      `${shop}: ${apply ? "switched off" : "would switch off"} the legacy abandoned-cart setting`,
    );
    if (apply) {
      // In place, so a webhook writing other schedules to the credential meanwhile is not undone.
      const path = ["shopifySurveys", String(surveys.indexOf(legacy)), "active"];
      await prisma.$executeRaw`UPDATE "Integration" SET credential = jsonb_set(credential, ${path}::text[], 'false'::jsonb) WHERE id = ${integration.id}::uuid`;
    }
  }

  const verb = apply ? "" : "would ";
  return {
    summary:
      `${integrations.length} shop(s): ${shopsNeedingTopics} ${verb}get new webhook topics, ` +
      `${rules} rule(s) ${verb}be created, ${settingsSwitchedOff} legacy setting(s) ${verb}be switched off` +
      (subscribeFailures ? `, ${subscribeFailures} subscription failure(s)` : "") +
      ".",
    details: {
      shops: integrations.length,
      shopsNeedingTopics,
      rules,
      settingsSwitchedOff,
      subscribeFailures,
    },
  };
}
