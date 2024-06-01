import prisma from "../../../../../../../utils/prisma";

export async function getAutomatedRepliesByTeamId(teamId: string) {
  const automatedReplies = await prisma.waAutomatedReply.findMany({
    where: {
      teamId,
    },
  });
  return automatedReplies;
}

export async function getAutomatedRepliesByOrgId(orgId: string) {
  const automatedReplies = await prisma.waAutomatedReply.findMany({
    where: {
      team: {
        orgId,
      },
    },
  });
  return automatedReplies;
}

export async function getAutomatedReplyById(id: string) {
  const automatedReply = await prisma.waAutomatedReply.findUnique({
    where: {
      id,
    },
  });
  return automatedReply;
}

export async function createAutomatedReply(data: any) {
  const automatedReply = await prisma.waAutomatedReply.create({
    data: {
      ...data,
    },
  });
  return automatedReply;
}

export async function updateAutomatedReply(id: string, data: any) {
  const automatedReply = await prisma.waAutomatedReply.update({
    where: {
      id,
    },
    data: {
      ...data,
    },
  });
  return automatedReply;
}

export async function deleteAutomatedReply(id: string) {
  const automatedReply = await prisma.waAutomatedReply.delete({
    where: {
      id,
    },
  });
  return automatedReply;
}
