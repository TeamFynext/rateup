import { sendAWSEmail } from "../sendAWSEmail";

export function sendResetPasswordMail(reset_link: string, email_id: string) {
  if (reset_link && email_id) {
    const msg = {
      to: email_id,
      subject: "Password Reset - RateUp.app",
      text: "Reset password for your rateup account.",
      html: createEmailBody(reset_link),
    };
    try {
      sendAWSEmail(msg);
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
      body {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: serif;
      }

      .frame {
        background-color: #f7f7f7;
        border-radius: 27px;
        padding: clamp(0.938rem, -0.848rem + 4.762vw, 3.438rem);
      }

      .overlap-group {
        border-radius: 23px;
        border: 3px solid #1c518e;
      }

      .email-title {
        color: #0a000d;
        font-size: 28px;
        font-style: normal;
        font-weight: 400;
        line-height: normal;
        padding-top: 60px;
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
        height: 76px;
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
  <body>
    <div class="frame">
      <div class="overlap-group">
        <table aria-describedby="email content">
          <thead>
            <tr>
              <th class="email-title">Reset Your Password</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <img
                  class="email-icon"
                  src="https://${process.env.AWS_CLOUDFRONT_DOMAIN}/1699439415146-resetpassword-icon.png"
                  alt="Email Logo"
                  width="111"
                  height="111"
                />
              </td>
            </tr>
            <tr>
              <td>
                <p class="email-body">
                  A password reset request for your account has been recieved
                </p>
              </td>
            </tr>
            <tr>
              <td>
                <a href="${reset_link}" class="verify-btn" style="color: #e5e5ef">
                  Reset Your Password
                </a>
              </td>
            </tr>
            <tr>
              <td class="thanks">
                Thanks,<br />
                Rateup Team
              </td>
            </tr>
            <tr>
              <td>
                <img
                  class="rateup-logo"
                  src="https://${process.env.AWS_CLOUDFRONT_DOMAIN}/1699439481211-rateup-logo.png"
                  alt="Rateup Logo"
                  width="134"
                  height="76"
                />
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
