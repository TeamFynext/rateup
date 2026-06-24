import { FastifyReply, FastifyRequest } from "fastify";
import {
  createReferral,
  getAllReferrals,
  deleteReferral,
  updateReferral,
} from "./referrals.service.js";

export async function trackVisitHandler(
  request: FastifyRequest<{ Body: { code: string } }>,
  reply: FastifyReply,
) {
  try {
    const { code } = request.body;
    if (!code) {
      return reply.code(400).send({ message: "code is required" });
    }
    await updateReferral(code, "visit");
    return reply.code(200).send({ success: true, message: "Visit tracked successfully" });
  } catch (error: any) {
    request.log.error(error, "Failed to track referral visit");
    if (error.message === "Referral not found") {
      return reply.code(404).send({ message: error.message });
    }
    return reply.code(500).send({ message: "Internal server error" });
  }
}

export async function deleteReferralHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    if (!id) {
      return reply.code(400).send({ message: "id is required" });
    }
    await deleteReferral(id);
    return reply.code(200).send({ success: true, message: "Referral deleted successfully" });
  } catch (error) {
    request.log.error(error, "Failed to delete referral");
    return reply.code(500).send({ message: "Internal server error" });
  }
}

export async function getAllReferralsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const referrals = await getAllReferrals();
    return reply.code(200).send(referrals);
  } catch (error) {
    request.log.error(error, "Failed to get all referrals");
    return reply.code(500).send({ message: "Internal server error" });
  }
}

export async function createReferralHandler(
  request: FastifyRequest<{ Body: { name: string; email: string } }>,
  reply: FastifyReply,
) {
  try {
    const { name, email } = request.body;
    if (!name) {
      return reply.code(400).send({ message: "name is required" });
    }
    if (!email) {
      return reply.code(400).send({ message: "email is required" });
    }

    const referral = await createReferral(name, email);

    return reply.code(201).send({
      referral_code: referral.referral_code,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return reply.code(400).send({ message: "Email already exists" });
    }
    request.log.error(error, "Failed to create referral");
    return reply.code(500).send({ message: "Internal server error" });
  }
}
