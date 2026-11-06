import { FastifyReply, FastifyRequest } from "fastify";

import { log } from "../../../utils/logger.js";
import { parseCardCode } from "./cardCode.js";
import { cardCodeIsServable, renderCardPng } from "./memberCard.service.js";

/**
 * `GET /api/public/loyalty/cards/:file` — the card PNG, rendered on request.
 *
 * Unauthenticated by design: Meta fetches it when the image message is sent, and the inbox
 * thumbnail loads it later. The image contains nothing but the code, so a guessed code
 * learns only that it exists, and only a code that belongs to an active member is
 * rendered at all. The response is immutable because the image is a pure function of
 * the code.
 */
export async function getMemberCardImageHandler(
  request: FastifyRequest<{ Params: { file: string } }>,
  reply: FastifyReply,
) {
  try {
    const code = parseCardCode(request.params.file);
    if (!code || !(await cardCodeIsServable(code))) {
      return reply.code(404).send({ error: "Card not found" });
    }
    const png = await renderCardPng(code);
    return reply
      .code(200)
      .header("Content-Type", "image/png")
      .header("Content-Length", String(png.length))
      .header("Cache-Control", "public, max-age=31536000, immutable")
      .header("X-Robots-Tag", "noindex")
      .send(png);
  } catch (e) {
    log.error(e);
    return reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}
