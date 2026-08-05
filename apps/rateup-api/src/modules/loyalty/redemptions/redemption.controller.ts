import { FastifyReply, FastifyRequest } from "fastify";
import {
  applyRedemption,
  getRedemptionsByCustomer,
  redeemReward,
  verifyRedemption,
  getTransactions,
  getTransactionsForExport,
} from "./redemption.service.js";
import { log } from "../../../utils/logger.js";
import {
  ApplyRedemptionInput,
  CustomerIdParam,
  RedeemRewardInput,
  VerifyRedemptionInput,
} from "../accounts/account.schema.js";
import { TransactionFilter } from "./redemption.schema.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";
import { toCsv } from "../../../utils/spreadsheet.js";

export async function redeemRewardHandler(
  request: FastifyRequest<{ Body: RedeemRewardInput }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }

    const result = await redeemReward(program.id, request.body);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      const target = (e as { meta?: { target?: unknown } }).meta?.target;
      const fields = Array.isArray(target) ? target.map(String) : [String(target ?? "")];

      if (fields.includes("rewardId") || fields.includes("accountId")) {
        reply.code(400).send({ error: "Reward already redeemed" });
        return;
      }

      reply.code(409).send({
        error: "Could not complete the redemption because of a code collision. Please try again.",
      });
      return;
    }
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function verifyRedemptionHandler(
  request: FastifyRequest<{ Body: VerifyRedemptionInput }>,
  reply: FastifyReply,
) {
  try {
    const result = await verifyRedemption(request.body.redemptionCode, request.user.orgId);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function applyRedemptionHandler(
  request: FastifyRequest<{ Body: ApplyRedemptionInput }>,
  reply: FastifyReply,
) {
  try {
    const result = await applyRedemption(request.body, request.user.orgId);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getRedemptionsByCustomerHandler(
  request: FastifyRequest<{ Params: CustomerIdParam }>,
  reply: FastifyReply,
) {
  try {
    const result = await getRedemptionsByCustomer(request.params.customerId, request.user.orgId);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getTransactionsHandler(
  request: FastifyRequest<{ Querystring: TransactionFilter }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      // if no program, return empty array to avoid 404s on frontend which expects an array in (all data get case)
      return reply.code(200).send([]);
    }

    // If export is requested
    if (request.query.export) {
      const transactions = await getTransactionsForExport(program.id, {
        fromDate: request.query.fromDate,
        toDate: request.query.toDate,
        transactionType: request.query.transactionType,
        source: request.query.source,
        customerId: request.query.customerId,
        minPoints: request.query.minPoints,
        maxPoints: request.query.maxPoints,
      });

      // Generate Excel/CSV
      if (request.query.export === "excel") {
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Transactions");

        // Add headers
        worksheet.columns = [
          { header: "Transaction ID", key: "id", width: 40 },
          { header: "Date", key: "date", width: 20 },
          { header: "Customer Name", key: "customerName", width: 25 },
          { header: "Customer Phone", key: "customerPhone", width: 20 },
          { header: "Type", key: "type", width: 15 },
          { header: "Source", key: "source", width: 20 },
          { header: "Points", key: "points", width: 12 },
          { header: "Balance After", key: "balanceAfter", width: 15 },
          { header: "Description", key: "description", width: 30 },
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        // Add data
        transactions.forEach((txn) => {
          worksheet.addRow({
            id: txn.id,
            date: txn.createdAt.toISOString(),
            customerName: txn.account.contact?.name || "N/A",
            customerPhone: txn.account.contact?.phone || "N/A",
            type: txn.transactionType,
            source: txn.source,
            points: txn.points,
            balanceAfter: txn.balanceAfter,
            description: txn.description || "",
          });
        });

        reply.header(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        reply.header(
          "Content-Disposition",
          `attachment; filename="transactions-${new Date().toISOString()}.xlsx"`,
        );

        const buffer = await workbook.xlsx.writeBuffer();
        return reply.send(buffer);
      } else {
        // CSV export
        const rows = [
          [
            "Transaction ID",
            "Date",
            "Customer Name",
            "Customer Phone",
            "Type",
            "Source",
            "Points",
            "Balance After",
            "Description",
          ],
        ];

        transactions.forEach((txn) => {
          rows.push([
            txn.id,
            txn.createdAt.toISOString(),
            txn.account.contact?.name || "N/A",
            txn.account.contact?.phone || "N/A",
            txn.transactionType,
            txn.source,
            txn.points.toString(),
            txn.balanceAfter.toString(),
            txn.description || "",
          ]);
        });

        const csv = toCsv(rows);

        reply.header("Content-Type", "text/csv");
        reply.header(
          "Content-Disposition",
          `attachment; filename="transactions-${new Date().toISOString()}.csv"`,
        );

        return reply.send(csv);
      }
    }

    // Regular paginated response
    const result = await getTransactions(program.id, {
      fromDate: request.query.fromDate,
      toDate: request.query.toDate,
      transactionType: request.query.transactionType,
      source: request.query.source,
      customerId: request.query.customerId,
      minPoints: request.query.minPoints,
      maxPoints: request.query.maxPoints,
      page: request.query.page,
      limit: request.query.limit,
    });

    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}
