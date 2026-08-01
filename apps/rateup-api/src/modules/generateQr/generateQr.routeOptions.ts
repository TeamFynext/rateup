import { asyncErrHandler } from "../../utils/commonUtils.js";
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
  schema: {},
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
