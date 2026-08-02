import { FastifyReply, FastifyRequest } from "fastify";
import { rateupLogo, webImagesBaseUrl } from "../../utils/constants/constants.js";
import { CreateBookDemoInput, CreatePartnerDataInput } from "./bookDemo.schema.js";
import { notificationQueue } from "../../utils/redisConnection.js";
import { escapeHtml } from "../../utils/html.js";
import { log } from "../../utils/logger.js";
import { createBookDemo } from "./bookDemo.service.js";

/**
 * The social icons in the email footer.
 *
 * The host used to be interpolated straight into an UNQUOTED src attribute, so an
 * API instance without the variable set rendered `src=undefined/images/...`. When
 * there is no host there is no image worth rendering, so the block is omitted
 * rather than emitted broken. See issues.txt 16.5.
 */
function footerSocialHtml(): string {
  const base = webImagesBaseUrl();
  if (!base) return "";
  const icons = [
    ["https://rateup.app", "website_logo.png", "Website"],
    ["https://www.linkedin.com/company/rateup", "linkedin_logo.png", "LinkedIn"],
    [
      "https://play.google.com/store/apps/details?id=com.rateupapp.rateup",
      "playstore_logo.png",
      "Play Store",
    ],
  ];
  return icons
    .map(
      ([href, file, alt]) => `
          <a href="${href}" target="_blank">
            <img src="${base}/images/email/${file}" alt="${alt}" />
          </a>`,
    )
    .join("");
}

export async function bookDemoHandler(
  request: FastifyRequest<{ Body: CreateBookDemoInput }>,
  reply: FastifyReply,
) {
  try {
    const { name, businessName, phone, message, workEmail } = request.body;

    // Every field below reaches an HTML email body. Escaped at the point of use,
    // because the plain-text alternative wants the raw values. See issues.txt 16.1.
    const safe = {
      name: escapeHtml(name),
      businessName: escapeHtml(businessName),
      phone: escapeHtml(phone),
      message: escapeHtml(message || "N/A"),
      workEmail: escapeHtml(workEmail),
    };

    const subject = `New Demo Request from ${name}`;
    const text = `
You have a new demo request:

Name: ${name}
Business: ${businessName}
Phone: ${phone}
Message: ${message || "N/A"}
Work Email: ${workEmail}
`;

    const html = `
  <h2>New Demo Request</h2>
  <p><strong>Name:</strong> ${safe.name}</p>
  <p><strong>Business:</strong> ${safe.businessName}</p>
  <p><strong>Phone:</strong> ${safe.phone}</p>
  <p><strong>Message:</strong> ${safe.message}</p>
  <p><strong>Work Email:</strong> ${safe.workEmail}</p>
`;

    // Recorded before anything is queued, so the lead survives a queue that drops
    // the job or a Redis that is down. A failure to record is logged and does not
    // stop the emails — the notification is still the faster path to the sales
    // team. See issues.txt 16.3.
    let recorded = false;
    try {
      await createBookDemo({ name, workEmail, businessName, phone, message });
      recorded = true;
    } catch (err) {
      log.error({ err }, "Failed to record a demo request; queueing the emails anyway");
    }

    await notificationQueue.add("notification", {
      emailData: {
        to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app",
        subject: subject,
        html: html,
        text: text,
      },
    });

    const emailForClient = {
      // A client that prefers text/plain used to be shown a blank message.
      // See issues.txt 16.8.
      text: `Hello, ${name}

We’ve received your demo request. We will contact you soon.

Name: ${name}
Business: ${businessName}
Phone: ${phone}
Message: ${message || "N/A"}

See you soon!
Team RateUp
`,
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

      .rateup-logo {
        width: 134px !important;
        height: 128px !important;
        margin-top: 10px;
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
          class="rateup-logo"
          src="${rateupLogo}"
          alt="RateUp Logo"
          width="134"
          height="128"
        />
      </div>

      <!-- Body -->
      <div style="padding: 30px 20px;">
        <h1 class="title">Demo Booked Successfully</h1>
        <p class="subtitle">Thank you for your interest in RateUp</p>

        <p class="body-text">
          Hello, ${safe.name} <br />
          We’ve received your demo request. We will contact you soon.
          Here are your booking details:
        </p>

        <div class="details">
          <h4>Booking Details</h4>
          <div class="detail-item"><strong>Name:</strong> ${safe.name}</div>
          <div class="detail-item"><strong>Business:</strong> ${safe.businessName}</div>
          <div class="detail-item"><strong>Phone:</strong> ${safe.phone}</div>
          <div class="detail-item"><strong>Message:</strong> ${safe.message}</div>
        </div>

        <div class="cta-row">
          <a href="https://rateup.app" class="primary-btn" target="_blank">
            Visit RateUp
          </a>
        </div>

        <p class="thanks">See you soon!<br />Team RateUp</p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-social" style="margin-bottom:10px;">${footerSocialHtml()}
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
    // Best-effort. The sales team has already been told and the request is already
    // recorded, so failing here would tell the requester their booking failed while
    // someone is on their way to contact them. See issues.txt 16.4.
    try {
      await notificationQueue.add("notification", {
        emailData: {
          to: workEmail,
          subject: emailForClient.subject,
          html: emailForClient.html,
          text: emailForClient.text,
        },
      });
    } catch (err) {
      log.error({ err, recorded }, "Failed to queue the demo booking confirmation");
    }

    return reply.status(200).send({
      success: true,
      message: "Your demo request has been received. We’ll contact you soon!",
    });
  } catch (err) {
    log.error({ err }, "Error handling demo booking");
    return reply.status(500).send({
      success: false,
      message: "Something went wrong while booking a demo.",
    });
  }
}

export async function partnerDataHandler(
  request: FastifyRequest<{ Body: CreatePartnerDataInput }>,
  reply: FastifyReply,
) {
  try {
    const {
      fullName,
      workEmail,
      phone,
      companyName,
      website,
      country,
      businessType,
      companySize,
      yearsInBusiness,
      whyPartner,
      services,
      referralVolume,
      managesClients,
      apiExperience,
      canOnboard,
    } = request.body;

    // The route schema requires an array, but this handler is exported and had no
    // guard of its own. See issues.txt 16.5.
    const serviceList = Array.isArray(services) ? services.join(", ") : String(services ?? "");

    const subject = `New Partner Inquiry from ${fullName}`;
    const text = `
      You have a new partner inquiry:

      Name: ${fullName}
      Email: ${workEmail}
      Phone: ${phone}
      Company: ${companyName}
      Website: ${website}
      Country: ${country}
      Business Type: ${businessType}
      Company Size: ${companySize}
      Years in Business: ${yearsInBusiness}
      Why Partner: ${whyPartner}
      Services: ${serviceList}
      Referral Volume: ${referralVolume}
      Manages Clients: ${managesClients}
      API Experience: ${apiExperience}
      Can Onboard: ${canOnboard}
    `;

    const html = `
      <h2>New Partner Inquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(workEmail)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Company:</strong> ${escapeHtml(companyName)}</p>
      <p><strong>Website:</strong> ${escapeHtml(website)}</p>
      <p><strong>Country:</strong> ${escapeHtml(country)}</p>
      <p><strong>Business Type:</strong> ${escapeHtml(businessType)}</p>
      <p><strong>Company Size:</strong> ${escapeHtml(companySize)}</p>
      <p><strong>Years in Business:</strong> ${escapeHtml(yearsInBusiness)}</p>
      <p><strong>Why Partner:</strong> ${escapeHtml(whyPartner)}</p>
      <p><strong>Services:</strong> ${escapeHtml(serviceList)}</p>
      <p><strong>Referral Volume:</strong> ${escapeHtml(referralVolume)}</p>
      <p><strong>Manages Clients:</strong> ${escapeHtml(managesClients)}</p>
      <p><strong>API Experience:</strong> ${escapeHtml(apiExperience)}</p>
      <p><strong>Can Onboard:</strong> ${escapeHtml(canOnboard)}</p>
    `;

    await notificationQueue.add("notification", {
      emailData: {
        to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app",
        subject: subject,
        html: html,
        text: text,
      },
    });

    return reply.status(200).send({
      success: true,
      message: "Partner inquiry submitted successfully",
    });
  } catch (error) {
    log.error({ err: error }, "Error in partnerDataHandler");
    return reply.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
}
