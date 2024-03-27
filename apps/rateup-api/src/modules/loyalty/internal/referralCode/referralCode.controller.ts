import { FastifyRequest } from "fastify/types/request";
import { createReferralCode } from "./referralCode.service";
import { ByOrgIdParams } from "../../../org/org.schema";
import { FastifyReply } from "fastify";
import { CreateReferralCodeInput } from "./referralCode.schema";

export async function createReferralCodeHandler(
  req: FastifyRequest<{
    Params: ByOrgIdParams;
    Body: CreateReferralCodeInput;
  }>,
  rep: FastifyReply,
) {
  const orgId = req.user.orgId;

  const refCode = await createReferralCode({
    //@ts-ignore TODO
    ...req.body,
    orgId,
  });

  rep.send(refCode);
}
