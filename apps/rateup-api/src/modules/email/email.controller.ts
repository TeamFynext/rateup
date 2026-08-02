import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import { generateOTP } from "./email.util.js";
import { GenerateOtpInput, SendEmailInput, validateOtpInput } from "./email.schema.js";
import { sendEmailService, storeOtp, validateOtp } from "./email.service.js";

/**
 * All three handlers used to answer `{ error: e?.message }` — on routes with no
 * authentication, so a Prisma failure named the model, the field and the
 * constraint to the internet. The message goes to the logger; the caller gets the
 * fixed string the old fallback already intended. See issues.txt 25.8.
 */
function reportFailure(reply: FastifyReply, error: unknown, context: string) {
  log.error({ err: error }, context);
  reply.code(500).send({ error: "Something Went Wrong! Try again." });
}

export async function sendEmailHandler(
  request: FastifyRequest<{ Body: SendEmailInput }>,
  reply: FastifyReply,
) {
  try {
    // `console.log(request.body)` used to print the recipient and the whole message
    // to stdout at no level, unredacted and unstructured. See issues.txt 25.11.
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
    // The template payload is built here rather than by assigning onto
    // `request.body.data` — `data` is z.any(), so a caller could send `data: null`
    // and the assignment threw a TypeError AFTER the code had been stored, leaving
    // a row behind and 500ing the request. See issues.txt 25.10.
    const res = await sendEmailService(request.body, { ...data, otp });
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
