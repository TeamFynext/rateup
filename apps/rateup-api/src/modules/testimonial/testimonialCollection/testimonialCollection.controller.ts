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
  createTestimonialCollection,
  deleteMultipleTestimonialFromCollection,
  deleteTestimonialCollection,
  getCollectionsByOrgId,
  getTestimonialCollectionById,
  getTestimonialCollectionsByTeamId,
  updateTestimonialCollection,
} from "./testimonialCollection.service.js";

export async function createTestimonialCollectionHandler(
  request: FastifyRequest<{ Body: CreateTestimonialCollectionInput }>,
  reply: FastifyReply,
) {
  try {
    const testimonialCollection = await createTestimonialCollection(
      request.body,
    );
    reply.code(201).send(testimonialCollection);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
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
    );
    reply.code(201).send(testimonialCollection);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getTestimonialCollectionByIdHandler(
  request: FastifyRequest<{ Params: ByCollectionIdParamsInput }>,
  reply: FastifyReply,
) {
  try {
    const collection = await getTestimonialCollectionById(request.params.id);
    reply.code(200).send(collection);
  } catch (error) {
    log.error(error);
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
      );
    else collections = await getCollectionsByOrgId(request.user.orgId);
    reply.code(200).send(collections);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function deleteTestimonialCollectionHandler(
  request: FastifyRequest<{ Params: ByCollectionIdParamsInput }>,
  reply: FastifyReply,
) {
  try {
    const collection = await deleteTestimonialCollection(request.params.id);
    reply.code(200).send(collection);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
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
    );
    reply.code(200).send(collection);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: `Something went wrong: ${error}` });
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
    );
    reply.code(200).send(collection);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: `Something went wrong: ${error}` });
  }
}
