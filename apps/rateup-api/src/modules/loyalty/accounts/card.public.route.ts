import { FastifyInstance } from "fastify";
import { z } from "zod";

import { rateLimit } from "../../../utils/rateLimit.js";
import { getMemberCardImageHandler } from "./memberCard.controller.js";

const cardFileParamSchema = z.object({
  /** `<code>.png` — the extension is there so WhatsApp and browsers treat it as an image. */
  file: z.string().min(1).max(64),
});

/**
 * Where a member card's image lives. Meta fetches it once per send; the limiter is only
 * against someone scripting the endpoint as a QR renderer.
 */
export async function loyaltyCardPublicRoutes(server: FastifyInstance) {
  server.get<{ Params: z.infer<typeof cardFileParamSchema> }>(
    "/:file",
    {
      preHandler: [rateLimit({ max: 120, windowSeconds: 60, key: "loyaltyCardImage" })],
      schema: { params: cardFileParamSchema },
    },
    getMemberCardImageHandler,
  );
}
