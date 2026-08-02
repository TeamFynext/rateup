import { FastifyRequest } from "fastify";
import {
  CreateGenerateQrRecordReqBody,
  GetGenerateQrRecordWithShortIdParams,
  updateGenerateQrRecordReqBodyType,
} from "./generateQr.schema.js";
import { getShortUrlId } from "../../utils/commonUtils.js";
import prisma from "../../utils/prisma.js";

async function createGenerateQrRecordInDB(
  req: FastifyRequest<{ Body: CreateGenerateQrRecordReqBody }>,
) {
  const {
    body: { name, link },
    user: { orgId, userId },
  } = req;

  // userId is absent for API-access-token-authenticated requests (see
  // global.d.ts's FastifyRequest.user), but createdById is a required column.
  if (!userId) {
    throw new Error("Cannot create a generateQr record without an authenticated user id.");
  }

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

async function getGenerateQrRecordWithShortIdFromDB(
  req: FastifyRequest<{ Params: GetGenerateQrRecordWithShortIdParams }>,
) {
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

async function getPublicGenerateQrRecordWithShortIdFromDB(
  req: FastifyRequest<{ Params: GetGenerateQrRecordWithShortIdParams }>,
) {
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

async function updateGenerateQrRecordWithShortIdInDB(
  req: FastifyRequest<{ Body: updateGenerateQrRecordReqBodyType }>,
) {
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

async function deleteGenerateQrRecordInDB(
  req: FastifyRequest<{ Params: GetGenerateQrRecordWithShortIdParams }>,
) {
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

// Was a bare update, which raises P2025 when the row is absent — the ordinary
// case for a QR code that has since been deleted — and nothing caught it, so an
// unauthenticated caller could make the API answer 500 (and write a stack trace
// through asyncErrHandler's console.log) by POSTing a short id that does not
// exist. updateMany treats the miss as a miss; the count it returns lets the
// controller answer 404 instead. See issues.txt 44.4.
async function incrementNoOfScansInDB(
  req: FastifyRequest<{ Params: GetGenerateQrRecordWithShortIdParams }>,
): Promise<boolean> {
  const { count } = await prisma.generateQr.updateMany({
    where: {
      shortUrlId: req.params.shortUrlId,
    },
    data: {
      noOfScans: {
        increment: 1,
      },
    },
  });
  return count > 0;
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
