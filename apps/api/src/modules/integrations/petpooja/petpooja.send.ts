import type { Integration } from "../../../../generated/prisma/client.js";
import { getUniqueRandomAlphaId } from "../../../utils/misc/random.utils.js";
import { sendWhatsAppTemplateToCustomer } from "../shopify/shopify.messages.js";
import {
  PETPOOJA_DEDUPE_WINDOW_MS,
  readPetpoojaCredential,
  updatePetpoojaHistory,
  type PetpoojaHistoryEntry,
  type PetpoojaOrderJobData,
} from "./petpooja.js";

/** Statuses that mean the customer has been, or is being, messaged. */
const COUNTS_AS_MESSAGED = new Set(["SENT", "SENDING"]);

export type PetpoojaOrderOutcome = "not_configured" | "duplicate" | "sent" | "failed";

/**
 * One Petpooja order: messages the customer at once. A second order message to
 * the same phone within {@link PETPOOJA_DEDUPE_WINDOW_MS} is skipped.
 */
export async function processPetpoojaOrder(
  integration: Pick<Integration, "id" | "orgId" | "credential">,
  { name, phone }: PetpoojaOrderJobData,
  now = new Date(),
): Promise<PetpoojaOrderOutcome> {
  const orderEvent = readPetpoojaCredential(integration.credential).orderEvent;
  if (!integration.orgId || !orderEvent?.waTemplateId || !orderEvent.teamId) {
    return "not_configured";
  }

  // The entry is claimed under the row lock before the send, so a webhook
  // Petpooja retries while the first send is in flight is skipped.
  const claim = await updatePetpoojaHistory(integration.id, (history) => {
    const recent = history.some(
      (entry) =>
        entry.phone === phone &&
        COUNTS_AS_MESSAGED.has(entry.status) &&
        now.getTime() - new Date(entry.createdAt).getTime() < PETPOOJA_DEDUPE_WINDOW_MS,
    );
    if (recent) return { history, result: null };

    const entry: PetpoojaHistoryEntry = {
      id: getUniqueRandomAlphaId(
        6,
        history.map((h) => h.id),
      ),
      name,
      phone,
      createdAt: now,
      status: "SENDING",
    };
    return { history: [...history, entry], result: entry };
  });
  if (!claim) return "duplicate";

  const res = await sendWhatsAppTemplateToCustomer(
    integration.orgId,
    claim.phone,
    orderEvent.waTemplateId,
    orderEvent.teamId,
    claim.name,
  );
  const status = res ? (res.status ? "SENT" : `FAILED: ${res.message}`) : "FAILED";
  await updatePetpoojaHistory(integration.id, (history) => ({
    history: history.map((h) => (h.id === claim.id ? { ...h, status } : h)),
    result: null,
  }));
  return status === "SENT" ? "sent" : "failed";
}
