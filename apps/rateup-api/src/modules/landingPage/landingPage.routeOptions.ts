import { RouteShorthandOptionsWithHandler } from "fastify";
import { asyncErrHandler } from "../../utils/commonUtils";
import {
  createLandingPage,
  deleteLandingPageById,
  getLandingPages,
  getLandingPageWithShortId,
  getPublicLandingPageWithShortId,
  updateLandingPageWithShortId,
  updatePageVisits,
} from "./landingPage.controllers";
import { landingPageSchemaRef } from "./landingPage.schema";
import { CustomRouteShortHandOptionsWithHandler } from "../../types/global";

const getLandingPagesRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    response: {
      "2xx": landingPageSchemaRef("getLandingPagesResponse"),
    },
  },
  handler: asyncErrHandler(getLandingPages),
};

const getLandingPageWithShortIdRouteOptions: RouteShorthandOptionsWithHandler =
  {
    schema: {
      params: landingPageSchemaRef("getLandingPageWithShortIdParams"),
      response: {
        "2xx": landingPageSchemaRef("landingPageBaseSchema"),
      },
    },
    handler: asyncErrHandler(getLandingPageWithShortId),
  };

const createLandingPageRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    body: landingPageSchemaRef("createLandingPageReqBody"),
    response: {
      "2xx": landingPageSchemaRef("landingPageBaseSchema"),
    },
  },
  handler: asyncErrHandler(createLandingPage),
};

const updateLandingPageWithShortIdRouteOptions: RouteShorthandOptionsWithHandler =
  {
    schema: {
      body: landingPageSchemaRef("updateLandingPageReqBody"),
      response: {
        "2xx": landingPageSchemaRef("landingPageBaseSchema"),
      },
    },
    handler: asyncErrHandler(updateLandingPageWithShortId),
  };

const deleteLandingPageByIdRouteOptions: RouteShorthandOptionsWithHandler = {
  schema: {
    params: landingPageSchemaRef("deleteLandingPageWithIddParams"),
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
      params: landingPageSchemaRef("updatePageVisitsReqParams"),
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
