import { FastifyInstance } from "fastify";
import { bookDemoHandler, partnerDataHandler } from "./bookDemo.controller.js";
import {
  createBookDemoInputSchema,
  createPartnerDataInputSchema,
  type CreateBookDemoInput,
  type CreatePartnerDataInput,
} from "./bookDemo.schema.js";
import { rateLimit } from "../../utils/rateLimit.js";

/**
 * Two public marketing forms. Neither carries a session — they are meant to be
 * open to the internet — so a per-IP limit is the only thing standing between the
 * sales inbox and a loop. The demo form queues two emails per request.
 * See issues.txt 16.2.
 *
 * Five an hour is generous for a human filling in a form once and retrying after a
 * typo, and useless as a flooding tool.
 */
const publicFormLimit = { max: 5, windowSeconds: 60 * 60 };

export async function bookDemoRoutes(server: FastifyInstance) {
  server.post<{ Body: CreateBookDemoInput }>(
    "/",
    {
      preHandler: rateLimit({ ...publicFormLimit, key: "bookDemo" }),
      schema: {
        body: createBookDemoInputSchema,
      },
    },
    bookDemoHandler,
  );
  server.post<{ Body: CreatePartnerDataInput }>(
    "/partner",
    {
      preHandler: rateLimit({ ...publicFormLimit, key: "bookDemoPartner" }),
      schema: {
        body: createPartnerDataInputSchema,
      },
    },
    partnerDataHandler,
  );
}
