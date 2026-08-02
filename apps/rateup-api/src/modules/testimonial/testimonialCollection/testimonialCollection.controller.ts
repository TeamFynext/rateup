import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../utils/logger.js";
import {
  ByCollectionIdParamsInput,
  CreateTestimonialCollectionInput,
  MultipleTestimonialToCollectionInput,
  TestimonialCollectionQuery,
  UpdateTestimonialCollectionInput,
} from "./testimonialCollection.schema.js";
import {
  addMultipleTestimonialToCollection,
  CollectionAccessError,
  createTestimonialCollection,
  deleteMultipleTestimonialFromCollection,
  deleteTestimonialCollection,
  getCollectionsByOrgId,
  getTestimonialCollectionById,
  getTestimonialCollectionsByTeamId,
  updateTestimonialCollection,
} from "./testimonialCollection.service.js";

function prismaCode(error: unknown) {
  return error && typeof error === "object" ? (error as { code?: string }).code : undefined;
}

/**
 * The five shapes every handler in this file shares. Two of them used to
 * interpolate the caught value into the response body — Prisma's message names
 * the model and the failing field, which on endpoints that accept arbitrary ids
 * is a working existence oracle. See issues.txt 31.6.
 */
function sendFailure(reply: FastifyReply, error: unknown, context: string) {
  log.error({ err: error }, context);
  if (error instanceof CollectionAccessError) {
    return reply.code(error.status).send({ error: error.message });
  }
  if (prismaCode(error) === "P2025") {
    return reply.code(404).send({ error: "Collection not found" });
  }
  reply.code(500).send({ error: "Something went wrong" });
}

export async function createTestimonialCollectionHandler(
  request: FastifyRequest<{ Body: CreateTestimonialCollectionInput }>,
  reply: FastifyReply,
) {
  try {
    const testimonialCollection = await createTestimonialCollection(
      request.body,
      request.user.orgId,
    );
    reply.code(201).send(testimonialCollection);
  } catch (error) {
    // (name, teamId) is unique on the model, so a repeated name is P2002 — the
    // information needed to say "that name is taken" was being discarded and
    // reported as a server error. See issues.txt 31.7.
    if (prismaCode(error) === "P2002") {
      return reply.code(409).send({ error: "A collection with that name already exists" });
    }
    sendFailure(reply, error, "Error creating testimonial collection");
  }
}

export async function updateTestimonialCollectionHandler(
  request: FastifyRequest<{
    Body: UpdateTestimonialCollectionInput;
    Params: ByCollectionIdParamsInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const testimonialCollection = await updateTestimonialCollection(
      request.body,
      request.params.id,
      request.user.orgId,
    );
    // Left at 201 — a 200 would be more accurate for an update, but no entry in
    // issues.txt covers it and clients may key on the status.
    reply.code(201).send(testimonialCollection);
  } catch (error) {
    if (prismaCode(error) === "P2002") {
      return reply.code(409).send({ error: "A collection with that name already exists" });
    }
    sendFailure(reply, error, "Error updating testimonial collection");
  }
}

export async function getTestimonialCollectionByIdHandler(
  request: FastifyRequest<{ Params: ByCollectionIdParamsInput }>,
  reply: FastifyReply,
) {
  try {
    const collection = await getTestimonialCollectionById(request.params.id);
    if (!collection) {
      return reply.code(404).send({ error: "Collection not found" });
    }
    reply.code(200).send(collection);
  } catch (error) {
    log.error({ err: error }, "Error reading testimonial collection");
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getTestimonialCollections(
  request: FastifyRequest<{ Querystring: TestimonialCollectionQuery }>,
  reply: FastifyReply,
) {
  try {
    let collections = null;
    if (request.query.teamId)
      collections = await getTestimonialCollectionsByTeamId(
        request.query.teamId,
        request.user.orgId,
      );
    else collections = await getCollectionsByOrgId(request.user.orgId);
    reply.code(200).send(collections);
  } catch (error) {
    sendFailure(reply, error, "Error listing testimonial collections");
  }
}

export async function deleteTestimonialCollectionHandler(
  request: FastifyRequest<{ Params: ByCollectionIdParamsInput }>,
  reply: FastifyReply,
) {
  try {
    const collection = await deleteTestimonialCollection(request.params.id, request.user.orgId);
    reply.code(200).send(collection);
  } catch (error) {
    sendFailure(reply, error, "Error deleting testimonial collection");
  }
}

//all the controllers listed below are used for adding multiple testimonials to a collection
export async function addMultipleTestimonialToCollectionHandler(
  request: FastifyRequest<{
    Params: ByCollectionIdParamsInput;
    Body: MultipleTestimonialToCollectionInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { testimonialIds } = request.body;
    const collection = await addMultipleTestimonialToCollection(
      request.params.id,
      testimonialIds,
      request.user.orgId,
    );
    reply.code(200).send(collection);
  } catch (error) {
    sendFailure(reply, error, "Error adding testimonials to collection");
  }
}

export async function deleteMultipleTestimonialsFromCollectionHandler(
  request: FastifyRequest<{
    Params: ByCollectionIdParamsInput;
    Body: MultipleTestimonialToCollectionInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const { testimonialIds } = request.body;
    const collection = await deleteMultipleTestimonialFromCollection(
      id,
      testimonialIds,
      request.user.orgId,
    );
    reply.code(200).send(collection);
  } catch (error) {
    sendFailure(reply, error, "Error removing testimonials from collection");
  }
}
