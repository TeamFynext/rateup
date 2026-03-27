import { RouteShorthandOptionsWithHandler } from "fastify";
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
import { CustomRouteShortHandOptionsWithHandler } from "../../types/global.js";
import {
  createLinktreeReqBody,
  getLinktreesResponse,
  getLinktreeWithShortIdParams,
  linktreeBaseSchema,
  updateLinktreeReqBody,
  updatePageVisitsOrLinkClicksReqBody,
  updatePageVisitsOrLinkClicksReqParams,
} from "./linktree.schema.js";

const getLinktreesRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    response: {
      "2xx": getLinktreesResponse,
    },
  },
  handler: asyncErrHandler(getLinktrees),
};

const getLinktreeWithShortIdRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    params: getLinktreeWithShortIdParams,
    response: {
      "2xx": linktreeBaseSchema,
    },
  },
  handler: asyncErrHandler(getLinktreeWithShortId),
};

const createLinktreeRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    body: createLinktreeReqBody,
    response: {
      "2xx": linktreeBaseSchema,
    },
  },
  handler: asyncErrHandler(createLinktree),
};

const updateLinktreeWithShortIdRouteOptions: RouteShorthandOptionsWithHandler =
  {
    schema: {
      body: updateLinktreeReqBody,
      response: {
        "2xx": linktreeBaseSchema,
      },
    },
    handler: asyncErrHandler(updateLinktreeWithShortId),
  };

const deleteLinktreeByIdRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {},
  handler: asyncErrHandler(deleteLinktreeById),
};

const getLinkTypeDropdownOptionsRouteOptions: RouteShorthandOptionsWithHandler =
  {
    schema: {},
    handler: asyncErrHandler(getLinkTypeDropdownOptions),
  };

const getPublicLinktreeWithShortIdRouteOptions: CustomRouteShortHandOptionsWithHandler =
  {
    schema: {},
    config: { isPublic: true },
    handler: asyncErrHandler(getPublicLinktreeWithShortId),
  };

const updatePageVisitsOrLinkClicksOptions: CustomRouteShortHandOptionsWithHandler =
  {
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
