import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import formDataPlugin from "@fastify/formbody";
import supertokens from "supertokens-node";
import { plugin, errorHandler } from "supertokens-node/framework/fastify/index.js";
import { SuperTokensConfig } from "../config.js";
import { parseCorsWhitelist } from "../utils/corsWhitelist.js";
import { registerSwagger } from "./swagger.js";
import { registerKafka } from "./kafka.js";
import { rateLimit } from "../utils/rateLimit.js";

type Limiter = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;

/** The email in a SuperTokens body: `formFields[{id:"email"}]` (email-password) or `email`. */
function bodyEmail(request: FastifyRequest): string | undefined {
  const body = request.body as
    | { email?: unknown; formFields?: { id?: unknown; value?: unknown }[] }
    | undefined;
  const fromForm = Array.isArray(body?.formFields)
    ? body.formFields.find((field) => field?.id === "email")?.value
    : undefined;
  const email = fromForm ?? body?.email;
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : undefined;
}

function bodyPhone(request: FastifyRequest): string | undefined {
  const phone = (request.body as { phoneNumber?: unknown } | undefined)?.phoneNumber;
  return typeof phone === "string" && phone.trim() ? phone.replace(/[^\d+]/g, "") : undefined;
}

const HOUR = 60 * 60;
const perIp = (key: string, max: number, windowSeconds: number, failClosed = false) =>
  rateLimit({ key, max, windowSeconds, failClosed });
const perEmail = (key: string, max: number, windowSeconds: number, failClosed = false) =>
  rateLimit({ key, max, windowSeconds, failClosed, keyFrom: bodyEmail });
const perPhone = (key: string, max: number, windowSeconds: number, failClosed = false) =>
  rateLimit({ key, max, windowSeconds, failClosed, keyFrom: bodyPhone });

/**
 * Limits on the SuperTokens endpoints, which are not Fastify routes and so carry no
 * preHandler of their own. Keyed `METHOD path` under `/api/auth`. Sign-up and SMS codes fail
 * closed: an unlimited burst there costs real money (SMS) or real rows (an org per sign-up).
 */
export const AUTH_RATE_LIMITS: Record<string, Limiter[]> = {
  "POST /signup": [
    perIp("auth:signup", 5, HOUR, true),
    perEmail("auth:signup:email", 3, HOUR, true),
  ],
  "POST /signin": [perIp("auth:signin", 30, 15 * 60), perEmail("auth:signin:email", 10, 15 * 60)],
  "POST /signinup/code": [
    perIp("auth:smsCode", 5, HOUR, true),
    perPhone("auth:smsCode:phone", 3, HOUR, true),
    perEmail("auth:smsCode:email", 3, HOUR, true),
  ],
  "POST /signinup/code/resend": [perIp("auth:smsCode", 5, HOUR, true)],
  "POST /signinup/code/consume": [perIp("auth:codeConsume", 30, 15 * 60)],
  "POST /signinup": [perIp("auth:thirdParty", 30, 15 * 60)],
  "POST /user/password/reset/token": [
    perIp("auth:resetToken", 10, HOUR),
    perEmail("auth:resetToken:email", 3, HOUR),
  ],
  "POST /user/password/reset": [perIp("auth:reset", 20, HOUR)],
  "GET /emailpassword/email/exists": [perIp("auth:emailExists", 30, HOUR)],
  "GET /passwordless/phonenumber/exists": [perIp("auth:phoneExists", 30, HOUR)],
};

/** The limiters for a request, or none when it is not a limited SuperTokens endpoint. */
export function authLimitersFor(method: string, url: string): Limiter[] {
  const path = url.split("?")[0];
  if (!path.startsWith("/api/auth/")) return [];
  return AUTH_RATE_LIMITS[`${method} ${path.slice("/api/auth".length).replace(/\/+$/, "")}`] ?? [];
}

/**
 * Runs before SuperTokens' own preHandler (it is added first), once the body is parsed so the
 * email or phone is readable. Stops at the first limiter that answers.
 */
export async function authRateLimitHook(request: FastifyRequest, reply: FastifyReply) {
  for (const limiter of authLimitersFor(request.method, request.url)) {
    await limiter(request, reply);
    if (reply.sent) return reply;
  }
}

export async function registerPlugins(server: FastifyInstance) {
  // SuperTokens initialization
  supertokens.init(SuperTokensConfig);
  await server.register(formDataPlugin);

  // Before the SuperTokens plugin, so its preHandler (which answers /api/auth/*) runs after.
  server.addHook("preHandler", authRateLimitHook);
  await server.register(plugin);

  server.setErrorHandler(errorHandler());

  server.addHook("onSend", async (request, reply, payload) => {
    const location = reply.getHeader("location");

    if (location && request.url.includes("/api/auth/callback/apple") && reply.statusCode === 200) {
      reply.code(303);
    }

    return payload;
  });

  // CORS. Exact origins only — see parseCorsWhitelist for why these are no longer
  // compiled to regexes.
  // STAFF_CONSOLE_ORIGIN: rateup-admin calls /api/staff directly from its own origin.
  const allowedOrigins: string[] = [
    process.env.FRONTEND_URL,
    process.env.STAFF_CONSOLE_ORIGIN?.replace(/\/+$/, ""),
  ].filter((origin): origin is string => !!origin);
  allowedOrigins.push(...parseCorsWhitelist(process.env.CORS_ALLOWED_ORIGINS));

  await server.register(cors, {
    origin: allowedOrigins,
    allowedHeaders: ["Content-Type", "X-Staff-Csrf", ...supertokens.getAllCORSHeaders()],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  // WebSocket
  await server.register(import("@fastify/websocket"));

  // Form data

  // SuperTokens plugin

  // Error handler

  // Kafka producer
  await registerKafka(server);

  // NOTE: BullMQ consumers and cron jobs deliberately do NOT live here. They run in
  // the separate worker service (src/worker.ts) so the API can be scaled to N
  // replicas without every replica firing the same cron tick N times.

  // The OpenAPI spec is always generated and served as JSON; the browsable UI is what
  // API_DOCS_ENABLED=true gates. See `plugins/swagger.ts`.
  await registerSwagger(server);
}
