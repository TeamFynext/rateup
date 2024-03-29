import { RouteShorthandOptionsWithHandler } from "fastify";
import { asyncErrHandler } from "../../utils/commnUtils";
import {
  createLandingPage,
  deleteLandingPageById,
  getLandingPages,
  getLandingPageWithShortId,
  getLinkTypeDropdownOptions,
  getPublicLandingPageWithShortId,
  updateLandingPageWithShortId,
} from "./landingPage.controllers";
import { landingPageSchemas, landingPageSchemaRef } from "./landingPage.schema";

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
  schema: {},
  handler: asyncErrHandler(deleteLandingPageById),
};

const getLinkTypeDropdownOptionsRouteOptions: RouteShorthandOptionsWithHandler =
  {
    schema: {},
    handler: asyncErrHandler(getLinkTypeDropdownOptions),
  };

const getPublicLandingPageWithShortIdRouteOptions: RouteShorthandOptionsWithHandler =
  {
    schema: {},
    // @ts-ignore
    config: { isPublic: true },
    handler: asyncErrHandler(getPublicLandingPageWithShortId),
  };

export {
  getLandingPagesRouteOptions,
  getLandingPageWithShortIdRouteOptions,
  createLandingPageRouteOptions,
  updateLandingPageWithShortIdRouteOptions,
  deleteLandingPageByIdRouteOptions,
  getLinkTypeDropdownOptionsRouteOptions,
  getPublicLandingPageWithShortIdRouteOptions,
};
