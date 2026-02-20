import { FastifyReply, FastifyRequest } from "fastify";
import pino from "pino";
const { NO_LOG } = process.env;
const devLog = {
  transport: {
    target: "pino-pretty",
    options: {
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
    },
  },
  serializers: {
    req: function (req: FastifyRequest) {
      return `${req.headers.origin}: ${req.method} ${req.url} FROM ${req.ip}`;
    },
    res: function (res: FastifyReply) {
      return `${res.statusCode}`;
    },
  },
};
console.log("set NO_LOG to true to disable logging");
const isDevelopment = process.env.NODE_ENV === "development";

// if NO_LOG is set to true, disable logging
// if NODE_ENV is set to development, use pretty logging
// else use default logging
let logOptionsValue: any;
if (NO_LOG === "true") {
  logOptionsValue = false;
} else if (isDevelopment) {
  logOptionsValue = devLog;
} else {
  logOptionsValue = true;
}
export const logOptions: any = logOptionsValue;
export const log = pino({
  enabled: NO_LOG !== "true",
  // available levels: fatal, error, warn, info, debug, trace
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
  },
});

console.log(`LOG_LEVEL => ${process.env.LOG_LEVEL || "info"}`);
