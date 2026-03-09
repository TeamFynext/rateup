import { NotificationType } from "../../../types/enums.js";
import { notificationQueue } from "../../redisConnection.js";

export async function sendVerifyMail(
  verify_link: string,
  email_id: string,
  user_name: string,
) {
  if (verify_link && email_id) {
    const msg = {
      to: email_id,
      subject: "Verify your email - RateUp.app",
      text: "Email verification for your rateup account.",
      html: createEmailBody(verify_link, user_name),
    };
    try {
      await notificationQueue.add("notification", {
        type: NotificationType.EMAIL,
        emailData: msg,
      });
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }
  }
}

export function createEmailBody(verify_link: string, user_name: string) {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email</title>
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
        font-family: "Lexend", sans-serif;
        margin: 0;
        padding: 0;
        background: #f0f3f9;
      }

      .container {
        max-width: 650px;
        margin: 40px auto;
        background: #fff;
        border-radius: 20px;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }

      .header {
        background: white;
        padding: 40px 20px;
        text-align: center;
      }

      .header img {
        width: 150px;
      }

      .title {
        font-size: 26px;
        font-weight: 600;
        margin: 30px 0 15px;
        color: #0a0a0a;
        text-align: center;
      }

      .icon {
        display: block;
        margin: 20px auto;
        width: 110px;
      }

      .body-text {
        color: #444;
        font-size: 16px;
        line-height: 1.6;
        text-align: center;
        max-width: 500px;
        margin: 0 auto 25px;
      }

      .verify-btn {
        display: inline-block;
        padding: 14px 32px;
        border-radius: 40px;
        background: linear-gradient(135deg, #1c518e, #326bb5);
        color: #fff !important;
        font-size: 17px;
        text-decoration: none;
        font-weight: 500;
        transition: all 0.3s ease;
      }

      .verify-btn:hover {
        background: linear-gradient(135deg, #163d6d, #1c518e);
      }

      .thanks {
        margin: 30px 0 10px;
        font-size: 16px;
        font-weight: 500;
        text-align: center;
        color: #222;
      }

      .footer {
        background: #fafafa;
        padding: 25px 15px;
        text-align: center;
        border-top: 1px solid #eee;
      }

      .footer-social img {
        margin: 0 8px;
        width: 28px;
        height: 28px;
      }

      .store-links img {
        margin: 15px 8px;
        width: 135px;
      }

      .newsletter {
        font-size: 13px;
        color: #666;
        margin: 12px 0;
      }

      .footer p {
        font-size: 13px;
        color: #777;
        margin: 8px 0;
      }

      .footer a {
        color: #1c518e;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Header -->
      <div class="header">
        <img
          src="${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/rateup_logo.png"
          alt="RateUp Logo"
        />
      </div>

      <!-- Body -->
      <div style="padding: 30px 20px;">
        <h2 class="title">Verify your Email Address</h2>
        <img
          class="icon"
          src="${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/emailVerificationIcon.png"
          alt="Email Verification"
        />

        <p class="body-text">
          Hello, ${user_name} 👋 <br />
          You're almost ready to get started. Please click the button below to
          verify your email and unlock the full RateUp experience.
        </p>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${verify_link}" class="verify-btn">Verify your Email</a>
        </div>

        <p class="thanks">Thanks,<br />The RateUp Team</p>
      </div>

      
      <div class="footer">
        <div class="footer-social">
        <a href="https://rateup.app" target="_blank">
          <img src="${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/website_logo.png" alt="Website" />
        </a>
        <a href="https://www.linkedin.com/company/rateup" target="_blank">
          <img src="${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/linkedin_logo.png" alt="LinkedIn" />
        </a>
          <a href="https://play.google.com/store/apps/details?id=com.rateupapp.rateup" target="_blank">
            <img src="${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/playstore_logo.png" alt="Play Store" />
          </a>
        </div>

        <p>You're receiving this email because you signed up on <strong>RateUp</strong>.</p>
       

        <p>
          Kasaragod, Kerala, India <br />
          &copy; ${new Date().getFullYear()} RateUp. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>
`;
}
