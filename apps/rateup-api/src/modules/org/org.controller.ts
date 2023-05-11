
import { FastifyReply, FastifyRequest } from "fastify";
import {
    createOrg,
} from "./org.services";
import { CreateOrgInput } from "./org.schema";
export async function createOrgHandler(
    request: FastifyRequest<{
      Body: CreateOrgInput;
    }>,
    reply: FastifyReply
  ) {
    const body = request.body;
    try {
      const survey = await createOrg(body);
      reply.code(201).send(survey);
    } catch (e:any) {
      // TODO
      console.error(e);

      reply.code(500).send({ error: e.message });
    }
  }