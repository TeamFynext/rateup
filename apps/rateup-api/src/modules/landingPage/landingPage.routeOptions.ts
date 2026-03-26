import { RouteShorthandOptionsWithHandler } from "fastify";
import { asyncErrHandler } from "../../utils/commonUtils.js";
import {
  createLandingPage,
  deleteLandingPageById,
  getLandingPages,
  getLandingPageWithShortId,
  getPublicLandingPageWithShortId,
  updateLandingPageWithShortId,
  updatePageVisits,
} from "./landingPage.controllers.js";
import { CustomRouteShortHandOptionsWithHandler } from "../../types/global.js";
import {
  createLandingPageReqBody,
  deleteLandingPageWithIddParams,
  getLandingPagesResponse,
  getLandingPageWithShortIdParams,
  landingPageBaseSchema,
  updateLandingPageReqBody,
  updatePageVisitsReqParams,
} from "./landingPage.schema.js";

const getLandingPagesRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    response: {
      "2xx": getLandingPagesResponse,
    },
  },
  handler: asyncErrHandler(getLandingPages),
};

const getLandingPageWithShortIdRouteOptions: RouteShorthandOptionsWithHandler =
  {
    schema: {
      params: getLandingPageWithShortIdParams,
      response: {
        "2xx": landingPageBaseSchema,
      },
    },
    handler: asyncErrHandler(getLandingPageWithShortId),
  };

const createLandingPageRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    body: createLandingPageReqBody,
    response: {
      "2xx": landingPageBaseSchema,
    },
  },
  handler: asyncErrHandler(createLandingPage),
};

const updateLandingPageWithShortIdRouteOptions: RouteShorthandOptionsWithHandler =
  {
    schema: {
      body: updateLandingPageReqBody,
      response: {
        "2xx": landingPageBaseSchema,
      },
    },
    handler: asyncErrHandler(updateLandingPageWithShortId),
  };

const deleteLandingPageByIdRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    params: deleteLandingPageWithIddParams,
  },
  handler: asyncErrHandler(deleteLandingPageById),
};

const getPublicLandingPageWithShortIdRouteOptions: CustomRouteShortHandOptionsWithHandler =
  {
    schema: {},
    config: { isPublic: true },
    handler: asyncErrHandler(getPublicLandingPageWithShortId),
  };

const updatePageVisitsWithShortIdRouteOptions: CustomRouteShortHandOptionsWithHandler =
  {
    schema: {
      params: updatePageVisitsReqParams,
    },
    config: { isPublic: true },
    handler: asyncErrHandler(updatePageVisits),
  };

export {
  createLandingPageRouteOptions,
  deleteLandingPageByIdRouteOptions,
  getLandingPagesRouteOptions,
  getLandingPageWithShortIdRouteOptions,
  getPublicLandingPageWithShortIdRouteOptions,
  updateLandingPageWithShortIdRouteOptions,
  updatePageVisitsWithShortIdRouteOptions,
};
