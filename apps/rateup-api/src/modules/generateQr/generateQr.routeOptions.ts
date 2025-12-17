import { RouteShorthandOptionsWithHandler } from "fastify";
import { CustomRouteShortHandOptionsWithHandler } from "../../types/global.js";
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
import { generateQrSchemaRef } from "./generateQr.schema.js";

const createGenerateQrRecordRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    body: generateQrSchemaRef("createGenerateQrRecordReqBody"),
    response: {
      "2xx": generateQrSchemaRef("generateQrBaseSchema"),
    },
  },
  handler: asyncErrHandler(createGenerateQrRecord),
};

const getPublicGenerateQrRecordWithShortIdRouteOptions: CustomRouteShortHandOptionsWithHandler =
  {
    schema: {},
    config: { isPublic: true },
    handler: asyncErrHandler(getPublicGenerateQrRecordWithShortId),
  };

const getGenerateQrRecordWithShortIdRouteOptions: RouteShorthandOptionsWithHandler =
  {
    schema: {
      params: generateQrSchemaRef("getGenerateQrRecordWithShortIdParams"),
      response: {
        "2xx": generateQrSchemaRef("generateQrBaseSchema"),
      },
    },
    handler: asyncErrHandler(getGenerateQrRecordWithShortId),
  };

const getAllGenerateQrRecordsRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    response: {
      "2xx": generateQrSchemaRef("getAllGenerateQrRecordsResponse"),
    },
  },
  handler: asyncErrHandler(getGenerateQrRecords),
};

const updateGenerateQrRecordWithShortIdRouteOptions: RouteShorthandOptionsWithHandler =
  {
    schema: {
      body: generateQrSchemaRef("updateGenerateQrRecordReqBody"),
      response: {
        "2xx": generateQrSchemaRef("generateQrBaseSchema"),
      },
    },
    handler: asyncErrHandler(updateGenerateQrRecordWithShortId),
  };

const deleteGenerateQrRecordWithShortIdRouteOptions: RouteShorthandOptionsWithHandler =
  {
    schema: {
      params: generateQrSchemaRef("getGenerateQrRecordWithShortIdParams"),
    },
    handler: asyncErrHandler(deleteGenerateQrRecordWithShortId),
  };

const incrementGenerateQrNoOfScansRouteOptions: CustomRouteShortHandOptionsWithHandler =
  {
    schema: {
      params: generateQrSchemaRef("getGenerateQrRecordWithShortIdParams"),
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
