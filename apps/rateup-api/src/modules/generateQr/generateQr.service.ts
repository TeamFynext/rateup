import { FastifyRequest } from "fastify";
import { CreateGenerateQrRecordReqBody } from "./generateQr.schema";
import { getShortUrlId } from "../../utils/commonUtils";
import prisma from "../../utils/prisma";

async function createGenerateQrRecordInDB(
  req: FastifyRequest<{ Body: CreateGenerateQrRecordReqBody }>,
) {
  const {
    body: { name, link },
    user: { orgId, userId },
  } = req;

  const newShortUrlId = getShortUrlId();

  const newGenerateQrRecord = await prisma.generateQr.create({
    data: {
      name,
      link,
      ownerOrgId: orgId,
      createdById: userId,
      shortUrlId: newShortUrlId,
    },
  });

  return newGenerateQrRecord;
}

async function getGenerateQrRecordWithShortIdFromDB(req) {
  const { shortUrlId } = req.params;
  const {
    user: { orgId },
  } = req;
  const generateQrRecord = await prisma.generateQr.findFirst({
    where: {
      shortUrlId,
      ownerOrgId: orgId,
    },
  });
  return generateQrRecord;
}

async function getPublicGenerateQrRecordWithShortIdFromDB(req) {
  const { shortUrlId } = req.params;
  const generateQrRecord = await prisma.generateQr.findFirst({
    where: {
      shortUrlId,
    },
    select: {
      name: true,
      shortUrlId: true,
      link: true,
    },
  });
  return generateQrRecord;
}

async function getAllGenerateQrRecordsFromDB(req: FastifyRequest) {
  const {
    user: { orgId },
  } = req;
  const allGenerateQrRecordsArray = await prisma.generateQr.findMany({
    where: {
      ownerOrgId: orgId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return allGenerateQrRecordsArray;
}

async function updateGenerateQrRecordWithShortIdInDB(req) {
  const {
    body: { shortUrlId, ...rest },
  } = req;
  const {
    user: { orgId },
  } = req;
  const updatedGenerateQrRecord = await prisma.generateQr.update({
    where: {
      shortUrlId,
      ownerOrgId: orgId,
    },
    data: {
      ...rest,
    },
  });
  return updatedGenerateQrRecord;
}

async function deleteGenerateQrRecordInDB(req) {
  const {
    user: { orgId },
  } = req;
  const deletedGenerateQrRecord = await prisma.generateQr.delete({
    where: {
      shortUrlId: req.params.shortUrlId,
      ownerOrgId: orgId,
    },
  });
  return deletedGenerateQrRecord;
}

async function incrementNoOfScansInDB(req) {
  await prisma.generateQr.update({
    where: {
      shortUrlId: req.params.shortUrlId,
    },
    data: {
      noOfScans: {
        increment: 1,
      },
    },
  });
}

export {
  createGenerateQrRecordInDB,
  getGenerateQrRecordWithShortIdFromDB,
  getPublicGenerateQrRecordWithShortIdFromDB,
  getAllGenerateQrRecordsFromDB,
  updateGenerateQrRecordWithShortIdInDB,
  deleteGenerateQrRecordInDB,
  incrementNoOfScansInDB,
};
