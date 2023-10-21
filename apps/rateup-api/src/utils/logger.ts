import { FastifyReply, FastifyRequest } from "fastify";
import pino from "pino";
import PinoPretty from "pino-pretty";
const { NO_LOG } = process.env;
const prettyLog = {
  transport: {
    target: "pino-pretty",
    options: {
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
    },
  },
  serializers: {
    req: function (req: FastifyRequest) {
      return `${req.headers.origin}: ${req.method} ${req.url} FROM ${req.ip}` ;
    },
    res: function (res: FastifyReply) {
      return `${res.statusCode}`;
    }
  }
};
console.log('set NO_LOG to true to disable logging')
export const logOptions: any = NO_LOG === "true" ? false : prettyLog;
export const log = pino(
  {
    enabled: NO_LOG !== "true",
    // available levels: fatal, error, warn, info, debug, trace
    level: process.env.LOG_LEVEL || "info",
  },
  PinoPretty()
);

console.log(`LOG_LEVEL => ${process.env.LOG_LEVEL || "info"}`)
