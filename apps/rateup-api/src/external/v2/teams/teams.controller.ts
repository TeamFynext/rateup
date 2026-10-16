import type { FastifyRequest } from "fastify";

import prisma from "../../../utils/prisma.js";
import {
  cursorOrderBy,
  cursorWhere,
  decodeCursor,
  toPage,
  type PaginationQuery,
} from "../pagination.js";

export async function listTeamsHandler(request: FastifyRequest<{ Querystring: PaginationQuery }>) {
  const { limit, cursor } = request.query;
  const rows = await prisma.team.findMany({
    where: { orgId: request.user.orgId, ...cursorWhere(decodeCursor(cursor)) },
    select: { id: true, name: true, createdAt: true },
    orderBy: cursorOrderBy,
    take: limit + 1,
  });
  return toPage(rows, limit, (row) => ({ id: row.id, name: row.name }));
}
