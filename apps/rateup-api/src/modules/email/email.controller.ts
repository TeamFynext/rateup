import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import { generateOTP } from "./email.util.js";
import {
  GenerateOtpInput,
  SendEmailInput,
  validateOtpInput,
} from "./email.schema.js";
import { sendEmailService, storeOtp, validateOtp } from "./email.service.js";

export async function sendEmailHandler(
  request: FastifyRequest<{ Body: SendEmailInput }>,
  reply: FastifyReply,
) {
  try {
    console.log(request.body);
    const res = await sendEmailService(request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply
      .code(500)
      .send({ error: e?.message || "Something Went Wrong! Try again." });
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
    data.otp = otp;
    const res = await sendEmailService(request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply
      .code(500)
      .send({ error: e?.message || "Something Went Wrong! Try again." });
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
    log.error(e);
    reply
      .code(500)
      .send({ error: e?.message || "Something Went Wrong! Try again." });
  }
}
