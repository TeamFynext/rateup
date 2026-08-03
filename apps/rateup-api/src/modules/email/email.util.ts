import { createEmailBodyOTPGeneration } from "./emailTemplates/emailTemplateOTPGeneration.js";
import { rateupLogo } from "../../utils/constants/constants.js";
import { escapeHtml } from "../../utils/html.js";
import crypto from "node:crypto";

/** The templates this module can render. Anything else has no body to send. */
export const EMAIL_PURPOSES = ["SurveyEmailOTPQuestion", "GeneralTemplate"] as const;

export function getEmailBodyTemplate(
  purpose: string | undefined,
  data: EmailTemplateData | undefined,
): string | undefined {
  switch (purpose) {
    case "SurveyEmailOTPQuestion":
      return createEmailBodyOTPGeneration(data);
    case "GeneralTemplate":
      return createGeneralEmailBodyTemaple(data?.body ?? "", data?.buttonLink ?? "", data?.title);
    default:
      throw new Error(`No email template for purpose "${purpose}"`);
  }
}

export function generateOTP(length: number) {
  const max = Math.pow(10, length) - 1;
  const randomNumber = crypto.randomInt(0, max + 1);
  return String(randomNumber).padStart(length, "0");
}

export function createGeneralEmailBodyTemaple(body: string, buttonLink: string, title?: string) {
  const safeLink = httpUrlOrNothing(buttonLink);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title></title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
      font-family: Arial, Helvetica, sans-serif;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    .container {
      max-width: 600px;
      margin: 24px auto;
      background: #f9fafb;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header {
      background: #1c518e;
      color: #fff;
      padding: 16px 24px;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .body {
      padding: 20px 24px;
      color: #1f2937;
      font-size: 14px;
    }
    
    .link-btn {
            padding: 10px 40px;
            border-radius: 10px;
            background: var(--RateUp-Blue, #1c518e);
            color: #e5e5ef;
            font-size: 16px;
            font-style: normal;
            font-weight: 400;
            line-height: normal;
            cursor: pointer;
            text-decoration: none;
    }
     .rateup-logo {
        width: 134px;
        height: 128px;
        margin-top: 10px;
    }
  </style>
</head>
<body>
  <table>
    <tr>
      <td align="center">
        <table class="container">
          <!-- Header -->
          <tr>
            <td class="header">
              <h1>${escapeHtml(title ?? "")}</h1>
            </td>
          </tr>
          <tr>
            <th>
                <img
                class="rateup-logo"
                    src="${rateupLogo}"
                    alt="Rateup Logo"
                    width="134"
                    height="128"
                />
            </th>
          </tr>

          <!-- Body -->
          <tr>
            <td class="body" align="center" style="text-align:center;">
              <p>${escapeHtml(body)}</p>
              ${
                safeLink
                  ? `<a href="${escapeHtml(safeLink)}" class="link-btn" style="color: #e5e5ef">
                 Visit
              </a>`
                  : ""
              }
              
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/** The link, if it is an ordinary http(s) URL; otherwise nothing. */
function httpUrlOrNothing(value: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
