import { notificationQueue } from "../../../workers/bullmq/queues/index.js";
import { rateupLogo } from "../../constants/constants.js";

export async function sendResetPasswordMail(reset_link: string, email_id: string) {
  if (reset_link && email_id) {
    const msg = {
      to: email_id,
      subject: "Password Reset - RateUp.app",
      text: "Reset password for your rateup account.",
      html: createEmailBody(reset_link),
    };
    try {
      await notificationQueue.add("notification", {
        emailData: msg,
      });
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }
  }
}

export function createEmailBody(reset_link: string) {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>email</title>
    <style>
      @media screen {
        @font-face {
          font-family: "Lexend";
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: url(https://fonts.gstatic.com/s/lexend/v19/wlptgwvFAVdoq2_F94zlCfv0bz1WCzsWzLdneg.woff2)
            format("woff2");
        }
      }
      body {
        font-family: "Lexend";
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .frame {
        background-color: #f7f7f7;
        border-radius: 27px;
        padding: clamp(0.938rem, -0.848rem + 4.762vw, 3.438rem);
      }

      .overlap-group {
        border-radius: 23px;
      }

      .email-title {
        color: #0a000d;
        font-size: 28px;
        font-style: normal;
        font-weight: 400;
        line-height: normal;
        padding-top: 40px;
      }

      .email-body {
        color: #000;
        font-size: 18px;
        font-style: normal;
        font-weight: 400;
        line-height: normal;
      }

      .verify-btn {
        padding: 14px 24px;
        border-radius: 30px;
        background: var(--RateUp-Blue, #1c518e);
        color: #e5e5ef;
        font-size: 18px;
        font-style: normal;
        font-weight: 400;
        line-height: normal;
        cursor: pointer;
        text-decoration: none;
      }

      .thanks {
        color: #0a000d;
        font-size: 18px;
        font-style: normal;
        font-weight: 400;
        line-height: normal;
      }

      .email-icon {
        width: 111px;
        height: 111px;
        flex-shrink: 0;
      }

      .rateup-logo {
        width: 134px;
        height: 128px;
        margin-top: 10px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      td,
      th {
        text-align: center;
        padding: 10px;
      }
    </style>
  </head>
  <body style="max-width: 1000px;font-family: 'Lexend', sans-serif;">
    <div class="frame">
      <div class="overlap-group">
        <table aria-describedby="email content">
          <thead>
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
            <tr>
              <th class="email-title">Reset Your Password</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <img
                  class="email-icon"
                  src="${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/resetPasswordIcon.png"
                  alt="Email Logo"
                  width="111"
                  height="111"
                />
              </td>
            </tr>
            <tr>
              <td center>
                <p class="email-body" style="max-width: 500px; text-align: center; margin: 0 auto;">
                  A password reset request for your account has been recieved
                </p>
              </td>
            </tr>
            <tr>
              <td></td>
            </tr>
            <tr>
              <td>
                <a href="${reset_link}" class="verify-btn" style="color: #e5e5ef">
                  Reset Your Password
                </a>
              </td>
            </tr>
            <tr>
              <td></td>
            </tr>            
            <tr>
              <td class="thanks">
                Thanks,<br />
                Rateup Team
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>
`;
}
