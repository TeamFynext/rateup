import { WaConversationCategory, WaPricingModel } from "../../../../generated/prisma/client.js";

/**
 * Meta sends `pricing.category` lowercase ("service", "marketing", ...) and
 * `pricing.pricing_model` uppercase ("PMP"). Both are normalized through an explicit
 * lookup that yields null on anything unrecognized rather than throwing: Meta adds
 * categories without notice, and these values are consumed inside a Kafka batch where
 * an exception would fail the whole batch and eventually DLQ real status updates over
 * a field nothing depends on.
 */
export function normalizePricingCategory(
  category: string | null | undefined,
): WaConversationCategory | null {
  if (!category) return null;
  const key = category.toUpperCase();
  return key in WaConversationCategory
    ? WaConversationCategory[key as keyof typeof WaConversationCategory]
    : null;
}

export function normalizePricingModel(model: string | null | undefined): WaPricingModel | null {
  if (!model) return null;
  const key = model.toUpperCase();
  return key in WaPricingModel ? WaPricingModel[key as keyof typeof WaPricingModel] : null;
}
