import { FastifyReply, FastifyRequest } from "fastify";
import {
  CreateBusinessHourInput,
  UpdateBusinessHourInput,
  BusinessHourParams,
} from "./businessHour.schema.js";
import prisma from "../../utils/prisma.js";

export async function createBusinessHourHandler(
  request: FastifyRequest<{
    Body: Required<CreateBusinessHourInput>;
  }>,
  reply: FastifyReply,
) {
  const user = request.user;
  const { name, timezone, channels, description, schedule } = request.body;

  try {
    const businessHour = await prisma.businessHour.create({
      data: { name, timezone, channels, description, schedule, orgId: user.orgId },
    });

    return reply.code(201).send(businessHour);
  } catch (error) {
    return reply.code(400).send(error);
  }
}

export async function getAllBusinessHoursHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;

  try {
    const businessHours = await prisma.businessHour.findMany({
      where: {
        orgId: user.orgId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return reply.send(businessHours);
  } catch (error) {
    return reply.code(400).send(error);
  }
}

export async function getBusinessHourHandler(
  request: FastifyRequest<{
    Params: BusinessHourParams;
  }>,
  reply: FastifyReply,
) {
  const user = request.user;
  const { id } = request.params;

  try {
    const businessHour = await prisma.businessHour.findFirst({
      where: {
        id,
        orgId: user.orgId,
      },
    });

    if (!businessHour) {
      return reply.code(404).send({ message: "Business hour not found" });
    }

    return reply.send(businessHour);
  } catch (error) {
    return reply.code(400).send(error);
  }
}

export async function updateBusinessHourHandler(
  request: FastifyRequest<{
    Params: BusinessHourParams;
    Body: UpdateBusinessHourInput;
  }>,
  reply: FastifyReply,
) {
  const user = request.user;
  const { id } = request.params;
  const body = request.body;

  try {
    const businessHour = await prisma.businessHour.findFirst({
      where: {
        id,
        orgId: user.orgId,
      },
    });

    if (!businessHour) {
      return reply.code(404).send({ message: "Business hour not found" });
    }

    // Named fields only: the row's org and id are never the client's to set.
    const { name, timezone, channels, description, schedule } = body;
    const updatedBusinessHour = await prisma.businessHour.update({
      where: { id },
      data: { name, timezone, channels, description, schedule },
    });

    return reply.send(updatedBusinessHour);
  } catch (error) {
    return reply.code(400).send(error);
  }
}

export async function deleteBusinessHourHandler(
  request: FastifyRequest<{
    Params: BusinessHourParams;
  }>,
  reply: FastifyReply,
) {
  const user = request.user;
  const { id } = request.params;

  try {
    const businessHour = await prisma.businessHour.findFirst({
      where: {
        id,
        orgId: user.orgId,
      },
    });

    if (!businessHour) {
      return reply.code(404).send({ message: "Business hour not found" });
    }

    await prisma.businessHour.delete({
      where: { id },
    });

    return reply.code(204).send();
  } catch (error) {
    return reply.code(400).send(error);
  }
}
