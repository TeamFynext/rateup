import { FastifyReply, FastifyRequest } from "fastify";
import {
  createReferral,
  getAllReferrals,
  deleteReferral,
  ReferralCodeError,
  updateReferral,
} from "./referrals.service.js";
import type { ByIdParams, CreateReferralInput, TrackVisitInput } from "./referrals.schema.js";
import connection from "../../utils/redisConnection.js";
import { log } from "../../utils/logger.js";

async function alreadyCountedToday(ip: string, code: string) {
  try {
    const key = `referral:visit:${code}:${ip}`;
    const first = await connection.set(key, "1", "EX", 86_400, "NX");
    return first === null;
  } catch (error) {
    log.error({ err: error, code }, "Referral visit dedup check failed; counting the visit");
    return false;
  }
}

export async function trackVisitHandler(
  request: FastifyRequest<{ Body: TrackVisitInput }>,
  reply: FastifyReply,
) {
  try {
    const { code } = request.body;
    if (!code) {
      return reply.code(400).send({ message: "code is required" });
    }

    if (!(await alreadyCountedToday(request.ip || "unknown", code))) {
      await updateReferral(code, "visit");
    }

    return reply.code(200).send({ success: true, message: "Visit tracked successfully" });
  } catch (error) {
    request.log.error(error, "Failed to track referral visit");
    return reply.code(500).send({ message: "Internal server error" });
  }
}

export async function deleteReferralHandler(
  request: FastifyRequest<{ Params: ByIdParams }>,
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
  request: FastifyRequest<{ Body: CreateReferralInput }>,
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
  } catch (error) {
    if (error instanceof ReferralCodeError) {
      return reply.code(500).send({ message: error.message });
    }
    if ((error as { code?: string } | null)?.code === "P2002") {
      const target = (error as { meta?: { target?: unknown } }).meta?.target;
      const fields = Array.isArray(target) ? target.map(String) : [String(target ?? "")];
      if (fields.some((f) => f.includes("referral_code"))) {
        return reply.code(409).send({ message: "Referral code already exists" });
      }
      return reply.code(400).send({ message: "Email already exists" });
    }
    request.log.error(error, "Failed to create referral");
    return reply.code(500).send({ message: "Internal server error" });
  }
}
