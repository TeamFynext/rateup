import { FastifyReply, FastifyRequest } from "fastify";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";
import { createBookDemo } from "./bookDemo.service";
import { CreateBookDemoInput } from "./bookDemo.schema";

export async function bookDemoHandler(
  request: FastifyRequest<{ Body: CreateBookDemoInput }>,
  reply: FastifyReply,
) {
  try {
    const {
      firstName,
      lastName,
      workEmail,
      phoneNumber,
      companyName,
      teamSize,
      preferredTime,
      primaryUseCase,
      additionalInfo,
    } = request.body;

    const savedDemo = await createBookDemo({
      firstName,
      lastName,
      workEmail,
      phoneNumber,
      companyName,
      teamSize,
      preferredTime,
      primaryUseCase,
      additionalInfo,
    });

    const subject = `New Demo Request from ${firstName} ${lastName}`;
    const text = `
      You have a new demo request:

      Name: ${firstName} ${lastName}
      Email: ${workEmail}
      Phone: ${phoneNumber}
      Company: ${companyName}
      Team Size: ${teamSize}
      Preferred Time: ${preferredTime}
      Use Case: ${primaryUseCase}
      Additional Info: ${additionalInfo}
    `;

    const html = `
      <h2>New Demo Request</h2>
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>Email:</strong> ${workEmail}</p>
      <p><strong>Phone:</strong> ${phoneNumber}</p>
      <p><strong>Company:</strong> ${companyName}</p>
      <p><strong>Team Size:</strong> ${teamSize}</p>
      <p><strong>Preferred Time:</strong> ${preferredTime}</p>
      <p><strong>Primary Use Case:</strong> ${primaryUseCase}</p>
      <p><strong>Additional Info:</strong> ${additionalInfo}</p>
    `;

    await sendAWSEmail({
      to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app",
      subject,
      text,
      html,
    });

    const emailForClient = {
      text: "",
      subject: "RateUp - Demo Booked Successfully",
      html: `
      
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Demo Booked — RateUp</title>
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
        margin: 20px 0 10px;
        color: #0a0a0a;
        text-align: center;
      }

      .subtitle {
        color: #556;
        font-size: 14px;
        text-align: center;
        margin-bottom: 25px;
      }

      .icon {
        display: block;
        margin: 10px auto 25px;
        width: 110px;
      }

      .body-text {
        color: #444;
        font-size: 16px;
        line-height: 1.6;
        text-align: center;
        max-width: 520px;
        margin: 0 auto 25px;
      }

      .details {
        max-width: 520px;
        margin: 0 auto 25px;
        background: #fbfdff;
        border: 1px solid #eef4ff;
        padding: 18px 22px;
        border-radius: 12px;
        font-size: 15px;
        color: #333;
      }

      .details h4 {
        margin: 0 0 15px;
        font-size: 17px;
        font-weight: 600;
        color: #1c518e;
        border-bottom: 1px solid #eef4ff;
        padding-bottom: 8px;
      }

      .detail-item {
        margin-bottom: 10px;
      }

      .detail-item strong {
        color: #1c518e;
        font-weight: 600;
      }

      .cta-row {
        text-align: center;
        margin: 24px 0;
      }

      .primary-btn {
        display: inline-block;
        padding: 12px 28px;
        border-radius: 40px;
        background: linear-gradient(135deg, #1c518e, #326bb5);
        color: #fff !important;
        font-size: 16px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.25s ease;
      }

      .primary-btn:hover {
        transform: translateY(-2px);
      }

      .thanks {
        margin: 25px 0 10px;
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
          src=${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/rateup_logo.png
          alt="RateUp Logo"
        />
      </div>

      <!-- Body -->
      <div style="padding: 30px 20px;">
        <h1 class="title">Demo Booked Successfully</h1>
        <p class="subtitle">Thank you for your interest in RateUp</p>

        <p class="body-text">
          Hello, ${firstName} <br />
          We’ve received your demo request. We will contact you soon.
          Here are your booking details:
        </p>

        <div class="details">
          <h4>Booking Details</h4>
          <div class="detail-item"><strong>Name:</strong> ${firstName} ${lastName}</div>
          <div class="detail-item"><strong>Email:</strong> ${workEmail}</div>
          <div class="detail-item"><strong>Phone:</strong> ${phoneNumber}</div>
          <div class="detail-item"><strong>Company:</strong> ${companyName}</div>
          <div class="detail-item"><strong>Team Size:</strong> ${teamSize}</div>
          <div class="detail-item"><strong>Preferred Time:</strong> ${preferredTime}</div>
          <div class="detail-item"><strong>Use Case:</strong> ${primaryUseCase}</div>
          <div class="detail-item"><strong>Additional Info:</strong> ${additionalInfo || "N/A"}</div>
        </div>

        <div class="cta-row">
          <a href=https://rateup.app class="primary-btn" target="_blank">
            Visit RateUp
          </a>
        </div>

        <p class="thanks">See you soon!<br />Team RateUp</p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-social" style="margin-bottom:10px;">
          <a href= https://rateup.app target="_blank">
            <img src=${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/website_logo.png alt="Website" />
          </a>
          <a href= https://www.linkedin.com/company/rateup target="_blank">
            <img src=${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/linkedin_logo.png alt="LinkedIn" />
          </a>
          <a href=https://play.google.com/store/apps/details?id=com.rateupapp.rateup target="_blank">
            <img src=${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/playstore_logo.png alt="Play Store" />
          </a>
        </div>

        <p>
          You’re receiving this email because you booked a demo on
          <strong>RateUp</strong>.
        </p>

        <p>
          Kasaragod, Kerala, India <br />
          &copy; ${new Date().getFullYear()} RateUp. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>
`,
    };

    await sendAWSEmail({
      to: workEmail,
      subject: emailForClient.subject,
      html: emailForClient.html,
      text: emailForClient.text,
    });

    return reply.status(200).send({
      success: true,
      message: "Your demo request has been received. We’ll contact you soon!",
      data: savedDemo,
    });
  } catch (err) {
    console.error("Error handling demo booking:", err);
    return reply.status(500).send({
      success: false,
      message: "Something went wrong while booking a demo.",
    });
  }
}
