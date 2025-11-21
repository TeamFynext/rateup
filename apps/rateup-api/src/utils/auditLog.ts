import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "./prisma";

const actionMap = {
  POST: "Create",
  PUT: "Update",
  PATCH: "Update",
  DELETE: "Delete",
};

export async function auditLogHook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Skip GET requests
  if (request.method === "GET") return;

  try {
    // Assuming user info is available on request.user (e.g. from JWT)
    const userId = request.userId;
    if (!userId) return; // skip if unauthenticated

    const readableAction = actionMap[request.method] ?? "Other";
    const route = request.url ?? request.routeOptions?.url;
    await prisma.auditLog.create({
      data: {
        userId,
        action: readableAction,
        method: request.method,
        route: route,
        body: request.body ?? {},
        orgId: request.user?.orgId ?? null,
      },
    });
  } catch (err) {
    request.log.error({ err }, "Failed to record audit log");
  }
}
