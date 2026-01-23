import { FastifyReply, FastifyRequest } from "fastify";
import {
  completeReferral,
  getReferralsByProgram,
  getReferralsByReferrer,
  trackReferral,
} from "./referral.service.js";
import { log } from "../../../utils/logger.js";
import {
  CompleteReferralInput,
  ReferrerIdParam,
  TrackReferralInput,
} from "./referral.schema.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";

export async function trackReferralHandler(
  request: FastifyRequest<{ Body: TrackReferralInput }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }

    const result = await trackReferral(
      program.id,
      request.body.referralCode,
      request.body.refereeContactId,
    );

    reply.code(201).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function completeReferralHandler(
  request: FastifyRequest<{ Body: CompleteReferralInput }>,
  reply: FastifyReply,
) {
  try {
    const result = await completeReferral(
      request.body.referralId,
      request.body.purchaseAmount,
    );
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function getReferralsByReferrerHandler(
  request: FastifyRequest<{ Params: ReferrerIdParam }>,
  reply: FastifyReply,
) {
  try {
    const result = await getReferralsByReferrer(request.params.referrerId);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function getReferralsByProgramHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }

    const result = await getReferralsByProgram(program.id);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}
