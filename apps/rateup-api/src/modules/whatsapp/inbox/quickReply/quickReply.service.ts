import prisma from "../../../../utils/prisma.js";
import { QuickReplyBody, UpdateQuickReplyInput } from "./quickReply.schema.js";

// A saved attachment's file is never deleted here: sending the reply puts the same
// URL in the message, so the file outlives the reply for as long as that chat exists.
export async function createWaQuickReply(data: QuickReplyBody, orgId: string) {
  return await prisma.whatsappQuickReply.create({
    data: {
      ...data,
      orgId,
    },
  });
}

export async function getWaQuickReplies(orgId: string) {
  return await prisma.whatsappQuickReply.findMany({
    where: {
      orgId,
    },
  });
}

export async function getWaQuickReplyById(id: string, orgId: string) {
  return await prisma.whatsappQuickReply.findFirst({
    where: {
      id,
      orgId,
    },
  });
}

export async function deleteWaQuickReplyById(id: string, orgId: string) {
  const existing = await prisma.whatsappQuickReply.findFirst({
    where: { id, orgId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Quick reply not found");
  }

  return await prisma.whatsappQuickReply.delete({
    where: {
      id,
    },
  });
}

export async function updateWaQuickReplyById(
  id: string,
  orgId: string,
  data: UpdateQuickReplyInput,
) {
  const existing = await prisma.whatsappQuickReply.findFirst({
    where: { id, orgId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Quick reply not found");
  }

  return await prisma.whatsappQuickReply.update({
    where: {
      id,
    },
    data,
  });
}
