import { PaymentPlanType } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { CONVERSATION_ADDON } from "../../subscription/catalog.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/**
 * Creates the conversation pack: an ADDON tier carrying its price in both currencies.
 *
 * There are deliberately no gateway plans behind it. A pack is bought outright for a
 * month rather than subscribed to, and a one-off Razorpay order names its own amount at
 * the moment it is created — so the price on this row is the whole product. Any gateway
 * plans left over from when packs were a subscription are unlinked here, so nothing can
 * accidentally sign a customer up to a pack that renews forever.
 *
 * Idempotent: re-running refreshes the row in place.
 */
export async function seedConversationAddon({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const existing = await prisma.rateupPlan.findFirst({ where: { name: CONVERSATION_ADDON.name } });
  const data = {
    name: CONVERSATION_ADDON.name,
    displayName: CONVERSATION_ADDON.displayName,
    planType: PaymentPlanType.ADDON,
    description: [...CONVERSATION_ADDON.description],
    // The pack's own conversation count lives on the tier, so the allowance maths can read
    // what one pack is worth without a second source of truth.
    features: {
      whatsapp: { conversation: { count: { max: CONVERSATION_ADDON.conversations } } },
    } as never,
    currency: "INR",
    price: CONVERSATION_ADDON.inrMonthly,
    monthlyPrice: CONVERSATION_ADDON.inrMonthly,
    usdMonthlyPrice: CONVERSATION_ADDON.usdMonthly,
    // Explicitly cleared, not merely omitted: an update has to undo the old links.
    monthlyPaymentPlanId: null,
    yearlyPaymentPlanId: null,
    usdMonthlyPaymentPlanId: null,
    usdYearlyPaymentPlanId: null,
    paymentPlanId: null,
  };

  if (existing?.monthlyPaymentPlanId || existing?.usdMonthlyPaymentPlanId) {
    log(
      `unlinking subscription plans: the pack is a one-off purchase now (${CONVERSATION_ADDON.name})`,
    );
  }

  if (!apply) {
    log(`${existing ? "would update" : "would create"} addon: ${CONVERSATION_ADDON.name}`);
  } else if (existing) {
    await prisma.rateupPlan.update({ where: { id: existing.id }, data });
    log(`updated addon: ${CONVERSATION_ADDON.name}`);
  } else {
    await prisma.rateupPlan.create({ data });
    log(`created addon: ${CONVERSATION_ADDON.name}`);
  }

  return {
    summary:
      `${apply ? "Seeded" : "Would seed"} the conversation pack ` +
      `(₹${CONVERSATION_ADDON.inrMonthly} / $${CONVERSATION_ADDON.usdMonthly} for ` +
      `${CONVERSATION_ADDON.conversations.toLocaleString("en-US")} conversations, one month).`,
    details: { conversations: CONVERSATION_ADDON.conversations },
  };
}
