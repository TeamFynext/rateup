import { createEmailBodyOTPGeneration } from "./emailTemplates/emailTemplateOTPGeneration";
import crypto from "crypto";

export function getEmailBodyTemplate(purpose, data) {
  switch (purpose) {
    case "SurveyEmailOTPQuestion":
      return createEmailBodyOTPGeneration(data);
  }
}

export function generateOTP(length) {
  const max = Math.pow(10, length) - 1;
  const randomNumber = crypto.randomInt(0, max + 1);
  return String(randomNumber).padStart(length, "0");
}
