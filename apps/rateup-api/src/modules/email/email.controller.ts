import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import { generateOTP } from "./email.util.js";
import { GenerateOtpInput, SendEmailInput, validateOtpInput } from "./email.schema.js";
import { isOrgMemberEmail, sendEmailService, storeOtp, validateOtp } from "./email.service.js";

function reportFailure(reply: FastifyReply, error: unknown, context: string) {
  log.error({ err: error }, context);
  reply.code(500).send({ error: "Something Went Wrong! Try again." });
}

export async function sendEmailHandler(
  request: FastifyRequest<{ Body: SendEmailInput }>,
  reply: FastifyReply,
) {
  try {
    if (!(await isOrgMemberEmail(request.user.orgId, request.body.toEmail))) {
      return reply
        .code(403)
        .send({ error: "Email can only be sent to members of your organisation." });
    }
    const res = await sendEmailService(request.body);
    reply.code(200).send(res);
  } catch (e) {
    reportFailure(reply, e, "Sending an email failed");
  }
}

export async function sendOTPEmailHandler(
  request: FastifyRequest<{ Body: GenerateOtpInput }>,
  reply: FastifyReply,
) {
  try {
    const otp = generateOTP(6);
    const { userId, surveyId, data } = request.body;
    await storeOtp(otp, userId, surveyId);
    // Always the OTP template: this route is public, so it must not render caller-chosen
    // titles, bodies or buttons in a RateUp-branded mail.
    const res = await sendEmailService(
      { ...request.body, purpose: "SurveyEmailOTPQuestion" },
      { surveyName: data?.surveyName, otp },
    );
    reply.code(200).send(res);
  } catch (e) {
    reportFailure(reply, e, "Sending an OTP email failed");
  }
}

export async function validateOTPHandler(
  request: FastifyRequest<{ Body: validateOtpInput }>,
  reply: FastifyReply,
) {
  try {
    const { userId, surveyId, otp } = request.body;
    const isValid = await validateOtp(otp, userId, surveyId);
    reply.code(200).send({ isValid });
  } catch (e) {
    reportFailure(reply, e, "Validating an OTP failed");
  }
}
