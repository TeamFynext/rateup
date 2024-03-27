import { generateRandomAlphaId } from "../../../../../utils/misc/random.utils";
import { GenerateReferralCodeInput } from "../../../internal/referralCode/referralCode.schema";
import { FastifyReply, FastifyRequest } from "fastify";
import { createReferralCode } from "../../../internal/referralCode/referralCode.service";

export async function generateReferralCodeHandler(
  req: FastifyRequest<{
    Body: GenerateReferralCodeInput;
  }>,
  rep: FastifyReply,
) {
  const referralCode = generateRandomAlphaId(6);
  const referralCodeGenerated = await createReferralCode({
    ...req.body,
    referralCode,
    orgId: req.user.orgId,
  });
  rep.send(referralCodeGenerated);
}
