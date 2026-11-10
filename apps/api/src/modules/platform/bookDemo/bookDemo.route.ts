import { FastifyInstance, FastifyRequest } from "fastify";
import { bookDemoHandler, partnerDataHandler } from "./bookDemo.controller.js";
import { createBookDemoInputSchema, createPartnerDataInputSchema } from "./bookDemo.schema.js";
import { declareAccess } from "../../../authz/registry.js";
import { rateLimit } from "../../../utils/rateLimit.js";

/**
 * Both forms are public and each submission emails the address it names (and RateUp's own
 * inbox), so they are throttled per client and per address.
 */
const perClient = (key: string) => rateLimit({ max: 5, windowSeconds: 60 * 60, key });
const perWorkEmail = (key: string) =>
  rateLimit<FastifyRequest<{ Body: { workEmail?: string } }>>({
    max: 2,
    windowSeconds: 24 * 60 * 60,
    key,
    keyFrom: (request) => request.body?.workEmail?.trim().toLowerCase(),
  });

export async function bookDemoRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "public" });
  server.post(
    "/",
    {
      preHandler: [perClient("bookDemo"), perWorkEmail("bookDemoEmail")],
      schema: {
        body: createBookDemoInputSchema,
      },
    },
    bookDemoHandler,
  );
  server.post(
    "/partner",
    {
      preHandler: [perClient("bookDemoPartner"), perWorkEmail("bookDemoPartnerEmail")],
      schema: {
        body: createPartnerDataInputSchema,
      },
    },
    partnerDataHandler,
  );
}
