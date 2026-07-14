import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  exportCommerceOrdersHandler,
  exportCommerceOverviewHandler,
  getCommerceChannelsHandler,
  getCommerceOrdersHandler,
  getCommerceOverviewHandler,
  getCommerceTimeseriesHandler,
  getCommerceTopProductsHandler,
} from "./commerce.controller.js";
import {
  commerceFilterSchema,
  commerceOrdersQuerySchema,
  commerceTimeseriesQuerySchema,
  commerceTopProductsQuerySchema,
  exportOrdersSchema,
  exportOverviewSchema,
} from "./commerce.schema.js";

export async function commerceRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.get("/channels", getCommerceChannelsHandler);

  server.get(
    "/overview",
    { schema: { querystring: commerceFilterSchema } },
    getCommerceOverviewHandler,
  );
  server.get(
    "/overview/timeseries",
    { schema: { querystring: commerceTimeseriesQuerySchema } },
    getCommerceTimeseriesHandler,
  );
  server.get(
    "/overview/top-products",
    { schema: { querystring: commerceTopProductsQuerySchema } },
    getCommerceTopProductsHandler,
  );

  server.get(
    "/orders",
    { schema: { querystring: commerceOrdersQuerySchema } },
    getCommerceOrdersHandler,
  );

  server.post(
    "/export/orders",
    { schema: { body: exportOrdersSchema } },
    exportCommerceOrdersHandler,
  );
  server.post(
    "/export/overview",
    { schema: { body: exportOverviewSchema } },
    exportCommerceOverviewHandler,
  );
}
