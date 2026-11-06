import prisma from "../../../utils/prisma.js";
import { getSubscription } from "../../subscription/subscription.service.js";
import { canMessageContact, type Recipient } from "../../subscription/activeContacts.js";
import { log } from "../../../utils/logger.js";

export async function getAutomatedReplyById(id: string, orgId: string) {
  return await prisma.waAutomatedReply.findFirst({
    where: {
      id,
      orgId,
    },
  });
}

export async function getAutomatedRepliesByKeyWeords(orgId: string, keyword: string) {
  return await prisma.waAutomatedReply.findFirst({
    where: {
      orgId,
      matchData: {
        path: ["keywords"],
        array_contains: [keyword],
      },
    },
  });
}

export async function verifyAutomationTriggerLimit(orgId: string, recipient?: Recipient) {
  const subscription = await getSubscription(orgId);
  if (!subscription?.features?.whatsapp?.active) {
    log.error("Whatsapp is inactive. Aborting automation check...");
    return false;
  }
  // Plans cap active contacts, not automation runs. A reply to someone who just wrote in
  // is always allowed, because their message already made them active.
  return await canMessageContact(orgId, recipient);
}
