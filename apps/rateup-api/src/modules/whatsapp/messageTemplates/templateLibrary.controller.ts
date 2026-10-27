import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import { GraphApiError } from "../wa_axios.js";
import { getGraphApiErrorMessage } from "../wa_error_handler.js";
import type { CreateFromLibraryInput, TemplateLibraryQuery } from "./templateLibrary.schema.js";
import { browseTemplateLibrary, createTemplateFromLibrary } from "./templateLibrary.service.js";

/** Meta's own words where it gave some, since they say what to fix. */
function libraryErrorMessage(e: unknown, fallback: string) {
  if (e instanceof GraphApiError) return getGraphApiErrorMessage(e) ?? fallback;
  if (e instanceof Error && e.message === "No WhatsApp account connected") return e.message;
  return fallback;
}

export async function getTemplateLibraryHandler(
  request: FastifyRequest<{ Querystring: TemplateLibraryQuery }>,
  reply: FastifyReply,
) {
  try {
    const page = await browseTemplateLibrary(request.user.orgId, request.query);
    return reply.send(page);
  } catch (e) {
    log.error({ err: e }, "Error browsing Meta's template library");
    return reply
      .code(e instanceof GraphApiError ? 400 : 500)
      .send({ message: libraryErrorMessage(e, "Couldn't load Meta's template library") });
  }
}

export async function createTemplateFromLibraryHandler(
  request: FastifyRequest<{ Body: CreateFromLibraryInput }>,
  reply: FastifyReply,
) {
  try {
    const saved = await createTemplateFromLibrary(request.user.orgId, request.body);
    return reply.code(201).send(saved);
  } catch (e) {
    log.error(
      { err: e, library: request.body.libraryTemplateName },
      "Error creating a template from Meta's library",
    );
    return reply
      .code(e instanceof GraphApiError ? 400 : 500)
      .send({ message: libraryErrorMessage(e, "Couldn't create the template") });
  }
}
