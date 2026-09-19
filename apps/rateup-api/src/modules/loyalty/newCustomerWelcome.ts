import { LoyaltyEventType } from "../../types/enums.js";
import prisma from "../../utils/prisma.js";
import { sendLoyaltyEvent } from "./messaging/send.js";

/**
 * Answers a contact's first-ever message with the welcome and its Join button.
 * "First" is counted from stored inbound messages, so the welcome goes out at most once
 * without a column to remember it; anyone already holding a loyalty account is skipped.
 */
export async function sendNewCustomerWelcomeIfDue(input: {
  orgId: string;
  contactId: string | null | undefined;
  phone: string;
  name?: string;
}): Promise<boolean> {
  const { orgId, contactId } = input;
  if (!contactId) return false;

  // Cheapest check first: most orgs have no welcome switched on.
  const trigger = await prisma.loyaltyEventTrigger.findFirst({
    where: {
      eventType: LoyaltyEventType.NEW_CUSTOMER_WELCOME,
      enabled: true,
      program: { orgId, status: "active" },
    },
    select: { id: true },
  });
  if (!trigger) return false;

  const inbound = await prisma.waMessage.findMany({
    where: { contactId, messageBody: { path: ["exchangeProcess"], equals: "receive" } },
    select: { id: true },
    take: 2,
  });
  if (inbound.length !== 1) return false;

  const member = await prisma.customerLoyaltyAccount.findFirst({
    where: { contactId },
    select: { id: true },
  });
  if (member) return false;

  const outcome = await sendLoyaltyEvent(
    orgId,
    LoyaltyEventType.NEW_CUSTOMER_WELCOME,
    { contactId, name: input.name },
    { name: input.name?.trim() || "there" },
  );
  return outcome.sent;
}
