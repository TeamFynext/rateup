import { FastifyRequest, FastifyReply } from "fastify";
import { generateRandomAlphaId } from "../../../../../../utils/misc/random.utils";
import { GenerateReferralCodeInput } from "../../../../../loyalty/internal/referralCode/referralCode.schema";
import { createReferralCode } from "../../../../../loyalty/internal/referralCode/referralCode.service";

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
