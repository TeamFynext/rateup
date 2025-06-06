import { RouteShorthandOptionsWithHandler } from "fastify";
import { asyncErrHandler } from "../../utils/commonUtils";
import {
  createLinktree,
  deleteLinktreeById,
  getLinktrees,
  getLinktreeWithShortId,
  getLinkTypeDropdownOptions,
  getPublicLinktreeWithShortId,
  updateLinktreeWithShortId,
  updatePageVisitsOrLinkClicks,
} from "./linktree.controllers";
import { linktreeSchemaRef } from "./linktree.schema";
import { CustomRouteShortHandOptionsWithHandler } from "../../types/global";

const getLinktreesRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    response: {
      "2xx": linktreeSchemaRef("getLinktreesResponse"),
    },
  },
  handler: asyncErrHandler(getLinktrees),
};

const getLinktreeWithShortIdRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    params: linktreeSchemaRef("getLinktreeWithShortIdParams"),
    response: {
      "2xx": linktreeSchemaRef("linktreeBaseSchema"),
    },
  },
  handler: asyncErrHandler(getLinktreeWithShortId),
};

const createLinktreeRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    body: linktreeSchemaRef("createLinktreeReqBody"),
    response: {
      "2xx": linktreeSchemaRef("linktreeBaseSchema"),
    },
  },
  handler: asyncErrHandler(createLinktree),
};

const updateLinktreeWithShortIdRouteOptions: RouteShorthandOptionsWithHandler =
  {
    schema: {
      body: linktreeSchemaRef("updateLinktreeReqBody"),
      response: {
        "2xx": linktreeSchemaRef("linktreeBaseSchema"),
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
      body: linktreeSchemaRef("updatePageVisitsOrLinkClicksReqBody"),
      params: linktreeSchemaRef("updatePageVisitsOrLinkClicksReqParams"),
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
