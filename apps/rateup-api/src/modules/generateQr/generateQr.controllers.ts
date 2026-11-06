import { FastifyReply, FastifyRequest } from "fastify";
import {
  CreateGenerateQrRecordReqBody,
  updateGenerateQrRecordReqBodyType,
} from "./generateQr.schema.js";
import { shortIdUniqueConstraintErrHandler } from "../../utils/commonUtils.js";
import connection from "../../utils/redisConnection.js";
import { log } from "../../utils/logger.js";
import {
  createGenerateQrRecordInDB,
  deleteGenerateQrRecordInDB,
  getAllGenerateQrRecordsFromDB,
  getGenerateQrRecordWithShortIdFromDB,
  getPublicGenerateQrRecordWithShortIdFromDB,
  incrementNoOfScansInDB,
  updateGenerateQrRecordWithShortIdInDB,
} from "./generateQr.service.js";

async function createGenerateQrRecord(
  req: FastifyRequest<{
    Body: CreateGenerateQrRecordReqBody;
  }>,
  rep: FastifyReply,
) {
  const newLandingPage = await shortIdUniqueConstraintErrHandler(() =>
    createGenerateQrRecordInDB(req),
  );
  rep.code(201).send(newLandingPage);
}

async function getGenerateQrRecordWithShortId(
  req: FastifyRequest<{ Params: { shortUrlId: string } }>,
  rep: FastifyReply,
) {
  const generateQrRecord = await getGenerateQrRecordWithShortIdFromDB(req);
  if (generateQrRecord) {
    rep.code(200).send(generateQrRecord);
  } else {
    rep.code(404).send({
      success: false,
      message: "Generate Qr Record with requested shortId not found.",
    });
  }
}

async function getPublicGenerateQrRecordWithShortId(
  req: FastifyRequest<{ Params: { shortUrlId: string } }>,
  rep: FastifyReply,
) {
  const generateQrRecordWithShortUrlId = await getPublicGenerateQrRecordWithShortIdFromDB(req);
  if (!generateQrRecordWithShortUrlId) {
    rep.code(404).send({
      success: false,
      message: "Generate Qr Record with requested shortId not found.",
    });
    return;
  }
  rep.code(200).send(generateQrRecordWithShortUrlId);
}

async function getGenerateQrRecords(req: FastifyRequest, rep: FastifyReply) {
  const allGenerateQrRecordsArray = await getAllGenerateQrRecordsFromDB(req);
  rep.code(200).send(allGenerateQrRecordsArray);
}

async function updateGenerateQrRecordWithShortId(
  req: FastifyRequest<{ Body: updateGenerateQrRecordReqBodyType }>,
  rep: FastifyReply,
) {
  const updatedGenerateQrRecord = await updateGenerateQrRecordWithShortIdInDB(req);
  rep.code(200).send(updatedGenerateQrRecord);
}

async function deleteGenerateQrRecordWithShortId(
  req: FastifyRequest<{ Params: { shortUrlId: string } }>,
  rep: FastifyReply,
) {
  await deleteGenerateQrRecordInDB(req);
  rep.code(200).send({ success: true, message: "Deleted QR sucessfully." });
}

async function alreadyCountedToday(ip: string, shortUrlId: string) {
  try {
    const key = `generateQr:scan:${shortUrlId}:${ip}`;
    const first = await connection.set(key, "1", "EX", 86_400, "NX");
    return first === null;
  } catch (error) {
    log.error({ err: error, shortUrlId }, "QR scan dedup check failed; counting the scan");
    return false;
  }
}

async function incrementGenerateQrNoOfScans(
  req: FastifyRequest<{ Params: { shortUrlId: string } }>,
  rep: FastifyReply,
) {
  const { shortUrlId } = req.params;

  if (await alreadyCountedToday(req.ip || "unknown", shortUrlId)) {
    // Answered the same way as a counted scan: whether this address has already
    // been seen today is not the caller's business, and a scanner has nothing
    // to do with the answer either way.
    rep.code(200).send({
      success: true,
      message: "Successfully incremented number of scan value.",
    });
    return;
  }

  if (!(await incrementNoOfScansInDB(req))) {
    rep.code(404).send({
      success: false,
      message: "Generate Qr Record with requested shortId not found.",
    });
    return;
  }

  rep.code(200).send({
    success: true,
    message: "Successfully incremented number of scan value.",
  });
}

export {
  createGenerateQrRecord,
  getGenerateQrRecordWithShortId,
  getPublicGenerateQrRecordWithShortId,
  getGenerateQrRecords,
  updateGenerateQrRecordWithShortId,
  deleteGenerateQrRecordWithShortId,
  incrementGenerateQrNoOfScans,
};
