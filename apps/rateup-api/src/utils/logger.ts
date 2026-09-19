import { isAxiosError } from "axios";
import pino from "pino";

const { NO_LOG, NODE_ENV, LOG_PRETTY } = process.env;

// Railway counts every stdout line against its 500 lines/sec cap, and
// pino-pretty spreads one entry over many (each field, each stack frame). So
// production writes one JSON line per entry — with `level` as a label and the
// text under `message`, which is what Railway parses as structured logs.
const pretty = LOG_PRETTY ? LOG_PRETTY === "true" : NODE_ENV === "development";

// pino's default copies every enumerable field, which for an AxiosError is the
// whole request/response pair — kilobytes per entry, bearer token included.
function serializeErr(err: unknown) {
  if (!isAxiosError(err)) return pino.stdSerializers.err(err as Error);
  return {
    type: "AxiosError",
    message: err.message,
    code: err.code,
    status: err.response?.status,
    method: err.config?.method,
    url: err.config?.url,
    data: err.response?.data,
  };
}

export const log = pino({
  enabled: NO_LOG !== "true",
  // available levels: fatal, error, warn, info, debug, trace
  level: process.env.LOG_LEVEL || "info",
  serializers: { err: serializeErr },
  ...(pretty
    ? {
        transport: {
          target: "pino-pretty",
          options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
        },
      }
    : {
        messageKey: "message",
        base: undefined,
        formatters: { level: (label: string) => ({ level: label }) },
      }),
});
