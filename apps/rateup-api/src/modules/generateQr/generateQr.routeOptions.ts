import { asyncErrHandler } from "../../utils/commonUtils.js";
import { rateLimit } from "../../utils/rateLimit.js";
import {
  createGenerateQrRecord,
  deleteGenerateQrRecordWithShortId,
  getGenerateQrRecords,
  getGenerateQrRecordWithShortId,
  getPublicGenerateQrRecordWithShortId,
  incrementGenerateQrNoOfScans,
  updateGenerateQrRecordWithShortId,
} from "./generateQr.controllers.js";
import {
  createGenerateQrRecordReqBody,
  generateQrBaseSchema,
  getAllGenerateQrRecordsResponse,
  getGenerateQrRecordWithShortIdParams,
  updateGenerateQrRecordReqBody,
} from "./generateQr.schema.js";

const createGenerateQrRecordRouteOptions = {
  schema: {
    body: createGenerateQrRecordReqBody,
    response: {
      "2xx": generateQrBaseSchema,
    },
  },
  handler: asyncErrHandler(createGenerateQrRecord),
};

const getPublicGenerateQrRecordWithShortIdRouteOptions = {
  // The route declared `schema: {}`, so the short id reached the query
  // unvalidated and no response shape was pinned. See issues.txt 44.3.
  schema: {
    params: getGenerateQrRecordWithShortIdParams,
  },
  config: { isPublic: true },
  handler: asyncErrHandler(getPublicGenerateQrRecordWithShortId),
};

const getGenerateQrRecordWithShortIdRouteOptions = {
  schema: {
    params: getGenerateQrRecordWithShortIdParams,
    response: {
      "2xx": generateQrBaseSchema,
    },
  },
  handler: asyncErrHandler(getGenerateQrRecordWithShortId),
};

const getAllGenerateQrRecordsRouteOptions = {
  schema: {
    response: {
      "2xx": getAllGenerateQrRecordsResponse,
    },
  },
  handler: asyncErrHandler(getGenerateQrRecords),
};

const updateGenerateQrRecordWithShortIdRouteOptions = {
  schema: {
    body: updateGenerateQrRecordReqBody,
    response: {
      "2xx": generateQrBaseSchema,
    },
  },
  handler: asyncErrHandler(updateGenerateQrRecordWithShortId),
};

const deleteGenerateQrRecordWithShortIdRouteOptions = {
  schema: {
    params: getGenerateQrRecordWithShortIdParams,
  },
  handler: asyncErrHandler(deleteGenerateQrRecordWithShortId),
};

const incrementGenerateQrNoOfScansRouteOptions = {
  schema: {
    params: getGenerateQrRecordWithShortIdParams,
  },
  config: { isPublic: true },
  // Per-address ceiling on top of the per-code daily dedup in the handler: one
  // address should not be able to walk the short-id space either. Reaches the
  // route only because the onRoute hook now appends rather than assigns.
  // See issues.txt 44.2 and 44.5.
  preHandler: [rateLimit({ max: 120, windowSeconds: 3600, key: "generateQrScan" })],
  handler: asyncErrHandler(incrementGenerateQrNoOfScans),
};

export {
  createGenerateQrRecordRouteOptions,
  getAllGenerateQrRecordsRouteOptions,
  getPublicGenerateQrRecordWithShortIdRouteOptions,
  getGenerateQrRecordWithShortIdRouteOptions,
  updateGenerateQrRecordWithShortIdRouteOptions,
  deleteGenerateQrRecordWithShortIdRouteOptions,
  incrementGenerateQrNoOfScansRouteOptions,
};
