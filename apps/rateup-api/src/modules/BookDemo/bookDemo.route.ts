import { FastifyInstance } from "fastify";
import { bookDemoHandler, partnerDataHandler } from "./bookDemo.controller.js";
import {
  createBookDemoInputSchema,
  createPartnerDataInputSchema,
  type CreateBookDemoInput,
  type CreatePartnerDataInput,
} from "./bookDemo.schema.js";
import { rateLimit } from "../../utils/rateLimit.js";

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
