import { createEmailBodyOTPGeneration } from "./emailTemplates/emailTemplateOTPGeneration.js";
import { rateupLogo } from "../../utils/constants/constants.js";
import crypto from "node:crypto";

export function getEmailBodyTemplate(purpose, data) {
  switch (purpose) {
    case "SurveyEmailOTPQuestion":
      return createEmailBodyOTPGeneration(data);
    case "GeneralTemplate":
      return createGeneralEmailBodyTemaple(
        data?.body,
        data?.buttonLink,
        data?.title,
      );
  }
}

export function generateOTP(length) {
  const max = Math.pow(10, length) - 1;
  const randomNumber = crypto.randomInt(0, max + 1);
  return String(randomNumber).padStart(length, "0");
}

export function createGeneralEmailBodyTemaple(
  body: string,
  buttonLink: string,
  title?: string,
) {
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
              <h1>${title ?? ""}</h1>
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
              <p>${body}</p>
              
              <a href="${buttonLink}" class="link-btn" style="color: #e5e5ef">
                 Visit
              </a>
              
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
