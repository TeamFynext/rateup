import type { WebSocket } from "@fastify/websocket";
import type { FastifyRequest } from "fastify";
import type { Redis } from "ioredis";

import { log } from "../../../utils/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { MAINTENANCE_RUN_CHANNEL } from "../../maintenance/backgroundRun.js";

/**
 * Live Update Center progress. The bullmq worker publishes each change to a background run
 * on {@link MAINTENANCE_RUN_CHANNEL}; every API replica that has a staff console socket open
 * subscribes and forwards it. The page fetches the run once and then only listens.
 *
 * The socket opens through the staff plugin like any GET, so it has passed the Access,
 * origin and session checks. A socket outlives the session it opened under, so it is closed
 * after {@link MAX_SOCKET_MS}; the page reconnects, which re-runs those checks.
 */
const MAX_SOCKET_MS = 10 * 60_000;

const sockets = new Set<WebSocket>();
let subscriber: Redis | null = null;

/** Subscribes on the first socket, so a replica nobody watches holds no extra connection. */
function ensureSubscriber() {
  if (subscriber) return;
  subscriber = baseRedis.duplicate();
  subscriber.on("message", (channel, message) => {
    if (channel !== MAINTENANCE_RUN_CHANNEL) return;
    const payload = `{"type":"maintenance.run","run":${message}}`;
    for (const socket of sockets) {
      if (socket.readyState === 1) socket.send(payload);
    }
  });
  subscriber.subscribe(MAINTENANCE_RUN_CHANNEL).catch((err) => {
    log.error({ err }, "staff: could not subscribe to maintenance run updates");
  });
}

export function handleMaintenanceSocket(socket: WebSocket, request: FastifyRequest) {
  ensureSubscriber();
  sockets.add(socket);
  const expiry = setTimeout(
    () => socket.close(4001, "Reconnect to re-check the session"),
    MAX_SOCKET_MS,
  );
  socket.on("close", () => {
    clearTimeout(expiry);
    sockets.delete(socket);
  });
  log.debug({ staff: request.staff?.email }, "staff: maintenance socket open");
}
