import { asyncErrHandler } from "../../utils/commonUtils.js";
import { rateLimit } from "../../utils/rateLimit.js";
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
  byIdParams,
  createLinktreeReqBody,
  getLinktreesResponse,
  getLinktreeWithShortIdParams,
  linkTypeParams,
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
  // Was `schema: {}`, so :id reached prisma.linktree.delete unvalidated and a
  // non-uuid produced a Prisma validation error and a 500 rather than a 400
  // naming the field. See issues.txt 45.6.
  schema: {
    params: byIdParams,
  },
  handler: asyncErrHandler(deleteLinktreeById),
};

const getLinkTypeDropdownOptionsRouteOptions = {
  schema: {
    params: linkTypeParams,
  },
  handler: asyncErrHandler(getLinkTypeDropdownOptions),
};

const getPublicLinktreeWithShortIdRouteOptions = {
  schema: {
    params: getLinktreeWithShortIdParams,
  },
  config: { isPublic: true },
  handler: asyncErrHandler(getPublicLinktreeWithShortId),
};

const updatePageVisitsOrLinkClicksOptions = {
  schema: {
    body: updatePageVisitsOrLinkClicksReqBody,
    params: updatePageVisitsOrLinkClicksReqParams,
  },
  config: { isPublic: true },
  // Per-address ceiling on top of the per-page daily dedup in the handler.
  // Reaches the route only because the onRoute hook now appends rather than
  // assigns. See issues.txt 45.3 and 45.7.
  preHandler: [rateLimit({ max: 240, windowSeconds: 3600, key: "linktreeCount" })],
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
