import { PaymentPlanType } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import {
  ADDONS,
  type AddonSpec,
  LEGACY_CONVERSATION_ADDON_NAME,
} from "../../subscription/catalog.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/**
 * Creates the add-on rows: the active contact pack and the campaign credit pack, each an
 * ADDON tier carrying its price in both currencies.
 *
 * There are no gateway plans behind them. A pack is bought outright, and a one-off
 * Razorpay order names its own amount when it is created — so the price on the row is the
 * whole product.
 *
 * The old conversation pack row is renamed into the contact pack rather than replaced, so
 * every pack already sold keeps pointing at a live row and keeps counting. Idempotent.
 */
export async function seedAddons({ apply, log }: TaskContext): Promise<TaskOutcome> {
  for (const spec of Object.values(ADDONS) as AddonSpec[]) {
    const existing =
      (await prisma.rateupPlan.findFirst({ where: { name: spec.name } })) ??
      (spec.kind === "ACTIVE_CONTACTS"
        ? await prisma.rateupPlan.findFirst({ where: { name: LEGACY_CONVERSATION_ADDON_NAME } })
        : null);

    const unitsKey = spec.kind === "ACTIVE_CONTACTS" ? "activeContacts" : "campaignCredits";
    const data = {
      name: spec.name,
      displayName: spec.displayName,
      planType: PaymentPlanType.ADDON,
      description: [...spec.description],
      // What one pack is worth lives on the row too, so the catalog API can show it.
      features: { whatsapp: { [unitsKey]: { count: { max: spec.units } } } } as never,
      currency: "INR",
      price: spec.inrMonthly,
      monthlyPrice: spec.inrMonthly,
      usdMonthlyPrice: spec.usdMonthly,
      monthlyPaymentPlanId: null,
      yearlyPaymentPlanId: null,
      usdMonthlyPaymentPlanId: null,
      usdYearlyPaymentPlanId: null,
      paymentPlanId: null,
    };

    if (!apply) {
      log(`${existing ? `would update ${existing.name} →` : "would create"} addon: ${spec.name}`);
    } else if (existing) {
      await prisma.rateupPlan.update({ where: { id: existing.id }, data });
      log(`updated addon: ${existing.name} → ${spec.name}`);
    } else {
      await prisma.rateupPlan.create({ data });
      log(`created addon: ${spec.name}`);
    }
  }

  return {
    summary:
      `${apply ? "Seeded" : "Would seed"} the active contact pack ` +
      `(${ADDONS.ACTIVE_CONTACTS.units.toLocaleString("en-US")} for ₹${ADDONS.ACTIVE_CONTACTS.inrMonthly} / $${ADDONS.ACTIVE_CONTACTS.usdMonthly}) ` +
      `and the campaign credit pack ` +
      `(${ADDONS.CAMPAIGN_CREDITS.units.toLocaleString("en-US")} for ₹${ADDONS.CAMPAIGN_CREDITS.inrMonthly} / $${ADDONS.CAMPAIGN_CREDITS.usdMonthly}).`,
    details: { packs: Object.values(ADDONS).map((spec) => spec.name) },
  };
}
