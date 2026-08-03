import { asyncErrHandler } from "../../utils/commonUtils.js";
import {
  createLinktree,
  deleteLinktreeById,
  getLinktrees,
  getLinktreeWithShortId,
  getLinkTypeDropdownOptions,
  getPublicLinktreeWithShortId,
  updateLinktreeWithShortId,
  updatePageVisitsOrLinkClicks,
} from "./linktree.controllers.js";
import {
  createLinktreeReqBody,
  getLinktreesResponse,
  getLinktreeWithShortIdParams,
  linktreeBaseSchema,
  updateLinktreeReqBody,
  updatePageVisitsOrLinkClicksReqBody,
  updatePageVisitsOrLinkClicksReqParams,
} from "./linktree.schema.js";

const getLinktreesRouteOptions = {
  schema: {
    response: {
      "2xx": getLinktreesResponse,
    },
  },
  handler: asyncErrHandler(getLinktrees),
};

const getLinktreeWithShortIdRouteOptions = {
  schema: {
    params: getLinktreeWithShortIdParams,
    response: {
      "2xx": linktreeBaseSchema,
    },
  },
  handler: asyncErrHandler(getLinktreeWithShortId),
};

const createLinktreeRouteOptions = {
  schema: {
    body: createLinktreeReqBody,
    response: {
      "2xx": linktreeBaseSchema,
    },
  },
  handler: asyncErrHandler(createLinktree),
};

const updateLinktreeWithShortIdRouteOptions = {
  schema: {
    body: updateLinktreeReqBody,
    response: {
      "2xx": linktreeBaseSchema,
    },
  },
  handler: asyncErrHandler(updateLinktreeWithShortId),
};

const deleteLinktreeByIdRouteOptions = {
  schema: {},
  handler: asyncErrHandler(deleteLinktreeById),
};

const getLinkTypeDropdownOptionsRouteOptions = {
  schema: {},
  handler: asyncErrHandler(getLinkTypeDropdownOptions),
};

const getPublicLinktreeWithShortIdRouteOptions = {
  schema: {},
  config: { isPublic: true },
  handler: asyncErrHandler(getPublicLinktreeWithShortId),
};

const updatePageVisitsOrLinkClicksOptions = {
  schema: {
    body: updatePageVisitsOrLinkClicksReqBody,
    params: updatePageVisitsOrLinkClicksReqParams,
  },
  config: { isPublic: true },
  handler: asyncErrHandler(updatePageVisitsOrLinkClicks),
};

export {
  createLinktreeRouteOptions,
  deleteLinktreeByIdRouteOptions,
  getLinktreesRouteOptions,
  getLinktreeWithShortIdRouteOptions,
  getLinkTypeDropdownOptionsRouteOptions,
  getPublicLinktreeWithShortIdRouteOptions,
  updateLinktreeWithShortIdRouteOptions,
  updatePageVisitsOrLinkClicksOptions,
};
