import { FastifyReply, FastifyRequest } from "fastify";
import dayjs from "dayjs";
import { write } from "hucre";
import { getSpreadsheetContentType, getSpreadsheetFilename } from "../../utils/spreadsheet.js";
import { log } from "../../utils/logger.js";
import type {
  CommerceFilter,
  CommerceOrdersQuery,
  CommerceTimeseriesQuery,
  CommerceTopProductsQuery,
  ExportOrdersInput,
  ExportOverviewInput,
} from "./commerce.schema.js";
import {
  getAllCommerceOrders,
  getCommerceChannels,
  getCommerceOrders,
  getCommerceOverview,
  getCommerceTimeseries,
  getCommerceTopProducts,
} from "./commerce.service.js";
import { ChannelNotFoundError } from "./commerce.errors.js";

/**
 * resolveChannelCatalogId throws on an unknown or foreign channel — that is a 400,
 * not a 500.
 *
 * Decided by CLASS, not by substring-matching the error's own message text. It
 * used to be `message.includes("Channel") || message.includes("catalog")`, and
 * the matched text was then echoed to the client verbatim — so any internal
 * failure whose message happened to contain "catalog" was misreported as a 400
 * AND leaked its raw text. Prisma is the obvious source: a validation error naming
 * the `catalogId` argument, or a connection error mentioning a catalog table, both
 * matched. The client was told its request was bad when the server had broken,
 * monitoring keyed on 5xx never saw it, and the body carried internal query
 * structure. All seven handlers route through here. See issues.txt 19.10.
 */
function sendError(reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof ChannelNotFoundError) {
    return reply.code(400).send({ error: error.message });
  }
  log.error({ err: error }, context);
  return reply.code(500).send({ error: "Something went wrong" });
}

export async function getCommerceChannelsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    return reply.send(await getCommerceChannels(request.user.orgId));
  } catch (error) {
    return sendError(reply, error, "Failed to load commerce channels");
  }
}

export async function getCommerceOverviewHandler(
  request: FastifyRequest<{ Querystring: CommerceFilter }>,
  reply: FastifyReply,
) {
  try {
    return reply.send(await getCommerceOverview(request.user.orgId, request.query));
  } catch (error) {
    return sendError(reply, error, "Failed to load commerce overview");
  }
}

export async function getCommerceTimeseriesHandler(
  request: FastifyRequest<{ Querystring: CommerceTimeseriesQuery }>,
  reply: FastifyReply,
) {
  try {
    return reply.send(await getCommerceTimeseries(request.user.orgId, request.query));
  } catch (error) {
    return sendError(reply, error, "Failed to load commerce timeseries");
  }
}

export async function getCommerceTopProductsHandler(
  request: FastifyRequest<{ Querystring: CommerceTopProductsQuery }>,
  reply: FastifyReply,
) {
  try {
    return reply.send(await getCommerceTopProducts(request.user.orgId, request.query));
  } catch (error) {
    return sendError(reply, error, "Failed to load top products");
  }
}

export async function getCommerceOrdersHandler(
  request: FastifyRequest<{ Querystring: CommerceOrdersQuery }>,
  reply: FastifyReply,
) {
  try {
    return reply.send(await getCommerceOrders(request.user.orgId, request.query));
  } catch (error) {
    return sendError(reply, error, "Failed to load commerce orders");
  }
}

function fmtDate(value: Date) {
  return dayjs(value).format("YYYY-MM-DD HH:mm");
}

export async function exportCommerceOrdersHandler(
  request: FastifyRequest<{ Body: ExportOrdersInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { format, ...filter } = request.body;
    const orders = await getAllCommerceOrders(orgId, filter);

    const buffer = await write({
      sheets: [
        {
          name: "Orders",
          columns: [
            { header: "Order ID", key: "id", autoWidth: true },
            { header: "Date", key: "date", autoWidth: true },
            { header: "Customer", key: "customer", autoWidth: true },
            { header: "Phone", key: "phone", autoWidth: true },
            { header: "Items", key: "items", autoWidth: true },
            { header: "Total", key: "total", autoWidth: true },
            { header: "Currency", key: "currency", autoWidth: true },
            { header: "Payment Method", key: "paymentMethod", autoWidth: true },
            { header: "Payment Status", key: "paymentStatus", autoWidth: true },
            { header: "Status", key: "status", autoWidth: true },
            { header: "Stage", key: "orderStage", autoWidth: true },
            { header: "Store Type", key: "storeType", autoWidth: true },
            { header: "Transaction ID", key: "transactionId", autoWidth: true },
            { header: "Catalog ID", key: "catalogId", autoWidth: true },
          ],
          data: orders.map((order) => ({
            id: order.id,
            date: fmtDate(order.createdAt),
            customer: order.contact?.name ?? "",
            phone: order.contact?.phone ?? "",
            items: order.itemCount,
            total: order.total,
            currency: order.currency ?? "",
            paymentMethod: order.paymentMethod ?? "",
            paymentStatus: order.paymentStatus ?? "",
            status: order.status ?? "",
            orderStage: order.orderStage ?? "",
            storeType: order.storeType ?? "",
            transactionId: order.transactionId ?? "",
            catalogId: order.catalogId,
          })),
        },
      ],
      format,
    });

    return reply
      .header("Content-Type", getSpreadsheetContentType(format))
      .header(
        "Content-Disposition",
        `attachment; filename="${getSpreadsheetFilename(`commerce_orders_${dayjs().format("YYYY-MM-DD")}`, format)}"`,
      )
      .send(buffer);
  } catch (error) {
    return sendError(reply, error, "Failed to export commerce orders");
  }
}

/** One workbook, three sheets, mirroring the three widgets on the overview page. */
export async function exportCommerceOverviewHandler(
  request: FastifyRequest<{ Body: ExportOverviewInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { format, interval, ...filter } = request.body;

    const [overview, timeseries, topProducts] = await Promise.all([
      getCommerceOverview(orgId, filter),
      getCommerceTimeseries(orgId, { ...filter, interval }),
      // The page's own limit, not a hard-coded 20. exportOverviewSchema's comment
      // says "Exports reuse the page's own filters so the file matches what's on
      // screen", and this sheet never did: the export always had 20 rows where the
      // chart had 5. See issues.txt 19.11.
      getCommerceTopProducts(orgId, { ...filter, limit: request.body.limit ?? 5 }),
    ]);

    const buffer = await write({
      sheets: [
        {
          name: "Summary",
          columns: [
            { header: "Metric", key: "metric", autoWidth: true },
            { header: "Value", key: "value", autoWidth: true },
            { header: "Change vs previous period (%)", key: "delta", autoWidth: true },
          ],
          data: [
            {
              metric: "Total sales",
              value: overview.totalSales,
              delta: overview.delta.totalSales ?? "",
            },
            { metric: "Paid sales", value: overview.paidSales, delta: "" },
            {
              metric: "Orders",
              value: overview.orderCount,
              delta: overview.delta.orderCount ?? "",
            },
            {
              metric: "Average order value",
              value: overview.avgOrderValue,
              delta: overview.delta.avgOrderValue ?? "",
            },
            { metric: "Products live", value: overview.productsLive, delta: "" },
          ],
        },
        {
          name: "Sales over time",
          columns: [
            { header: "Date", key: "date", autoWidth: true },
            { header: "Sales", key: "sales", autoWidth: true },
            { header: "Orders", key: "orders", autoWidth: true },
          ],
          data: timeseries,
        },
        {
          name: "Top products",
          columns: [
            { header: "Product", key: "name", autoWidth: true },
            { header: "Retailer ID", key: "retailerId", autoWidth: true },
            { header: "Units", key: "units", autoWidth: true },
            { header: "Revenue", key: "revenue", autoWidth: true },
          ],
          data: topProducts.map(({ name, retailerId, units, revenue }) => ({
            name,
            retailerId,
            units,
            revenue,
          })),
        },
      ],
      format,
    });

    return reply
      .header("Content-Type", getSpreadsheetContentType(format))
      .header(
        "Content-Disposition",
        `attachment; filename="${getSpreadsheetFilename(`commerce_overview_${dayjs().format("YYYY-MM-DD")}`, format)}"`,
      )
      .send(buffer);
  } catch (error) {
    return sendError(reply, error, "Failed to export commerce overview");
  }
}
