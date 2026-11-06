import { renderGeneralEmail, renderOtpEmail } from "../../utils/email/react/templates.js";
import crypto from "node:crypto";

/** The templates this module can render. Anything else has no body to send. */
export const EMAIL_PURPOSES = ["SurveyEmailOTPQuestion", "GeneralTemplate"] as const;

export function getEmailBodyTemplate(
  purpose: string | undefined,
  data: EmailTemplateData | undefined,
): Promise<string> {
  switch (purpose) {
    case "SurveyEmailOTPQuestion":
      return renderOtpEmail({ otp: data?.otp ?? "", surveyName: data?.surveyName });
    case "GeneralTemplate":
      return renderGeneralEmail({
        body: data?.body ?? "",
        title: data?.title,
        buttonLink: httpUrlOrNothing(data?.buttonLink ?? ""),
      });
    default:
      throw new Error(`No email template for purpose "${purpose}"`);
  }
}

export function generateOTP(length: number) {
  const max = Math.pow(10, length) - 1;
  const randomNumber = crypto.randomInt(0, max + 1);
  return String(randomNumber).padStart(length, "0");
}

/** The link, if it is an ordinary http(s) URL; otherwise nothing. */
export function httpUrlOrNothing(value: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
