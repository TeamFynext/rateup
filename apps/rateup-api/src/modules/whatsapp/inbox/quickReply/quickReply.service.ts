import prisma from "../../../../utils/prisma.js";
import { QuickReplyBody, UpdateQuickReplyInput } from "./quickReply.schema.js";

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

export async function getWaQuickReplyById(id: string) {
  return await prisma.whatsappQuickReply.findUnique({
    where: {
      id,
    },
  });
}

export async function deleteWaQuickReplyById(id: string) {
  return await prisma.whatsappQuickReply.delete({
    where: {
      id,
    },
  });
}

export async function updateWaQuickReplyById(id: string, data: UpdateQuickReplyInput) {
  return await prisma.whatsappQuickReply.update({
    where: {
      id,
    },
    data,
  });
}
