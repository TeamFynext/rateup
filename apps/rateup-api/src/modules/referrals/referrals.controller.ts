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

/**
 * One visit per IP per code per day.
 *
 * The endpoint is unauthenticated and counted every call with no deduplication,
 * so the figure the module exists to produce was directly writable — without
 * limit — by the people it measures. A per-IP rate limit bounds the RATE; this
 * bounds the TOTAL a single source can contribute. Fails OPEN for the same
 * reason the rate limiter does: a Redis outage should not stop legitimate visits
 * being counted. See issues.txt 38.1.
 */
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

    // The same answer whether or not the code resolved. It used to 404 for an
    // unknown code, which made the code space enumerable through an endpoint
    // that needs no credential — and 38.2 made that a small space for any known
    // influencer name. See issues.txt 38.5.
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
    // deleteMany, so a row that is already gone is an idempotent success rather
    // than a 500. See issues.txt 38.6.
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
    // Referral has TWO unique columns — referral_code and email — and this branch
    // did not look at which one the error named, so a code collision was reported
    // as a duplicate email. The operator would change the email, retry, and hit
    // the same collision, because the code is regenerated from the same name by
    // the same generator. Prisma carries meta.target; it was available and
    // discarded. See issues.txt 38.3.
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
