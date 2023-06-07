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
};
console.log('set NO_LOG to true to disable logging')
export const logOptions: any = NO_LOG === "true" ? false : prettyLog;
export const log = pino(
  {
    enabled: NO_LOG !== "true",
  },
  PinoPretty()
);
