// The ported dispatcher code logged through the Fastify instance it created
// (`fastify.log.*`). There is no such instance in a worker process, so it logs
// through the shared pino logger the rest of the API uses.
//
// Those call sites are printf-style with `unknown` catch bindings
// (`log.error("... %o", err)`), a shape pino's own overloads reject under
// `strict`. Widening the signatures here keeps ~30 ported call sites identical to
// the code that has been running in production instead of rewriting each one.
import { log as pinoLog } from "../../utils/logger.js";

type LooseLogFn = (...args: unknown[]) => void;

export const log = pinoLog as unknown as Record<
  "fatal" | "error" | "warn" | "info" | "debug" | "trace",
  LooseLogFn
>;
