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
  // findFirst returns null for a deleted or mistyped code, and this used to send
  // that null with a 200 — so anything treating a 2xx as success (a fetch
  // wrapper, a retry policy, an uptime check) read a dead QR code as a working
  // one. The authenticated twin above already answers 404 for exactly this.
  // See issues.txt 44.3.
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

// One scan per address per code per day. The counter is unauthenticated by
// design — a scanner has no session — so without this anyone who knows an eight
// character short id could raise another organisation's scan count without
// bound, and noOfScans is the only measure the product offers of whether a
// printed campaign worked. Fails open: a Redis outage should not stop counting.
// See issues.txt 44.2.
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

  // A short id that resolves to nothing is a client condition, not a server
  // fault. See issues.txt 44.4.
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
