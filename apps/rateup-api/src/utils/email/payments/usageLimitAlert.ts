import { billingPage, statsPage } from "../../constants/constants.js";
import prisma from "../../prisma.js";
import { sendAWSEmail } from "../sendAWSEmail.js";
//Send limit reached alert (only 1 mail in a week)
export async function sendUsageLimitMailAlert(orgId) {
  const subscription = await prisma.subscription.findUnique({
    where: { orgId },
    include: {
      org: {
        include: {
          owner: true,
        },
      },
    },
  });

  if (
    !subscription ||
    subscription?.lastLimitAlertSentAt >=
      new Date(new Date().setDate(new Date().getDate() - 7))
  ) {
    // Alert already sent within the last week or subscription does not exist
    return { message: "No action needed" };
  } else {
    console.log(
      "....Sending Usage Limit Reached Mail Alert......" +
        subscription?.org?.owner?.email,
    );
    const msg = {
      to: subscription?.org?.owner?.email, // Change to your recipient
      // from: 'hello@rateup.app', // Change to your verified sender
      subject: "Rateup Subscription Limit Reached - Rateup.app",
      text: `Rateup Usage Limit Exceeded Alert. Please upgrade your plan`,
      html: usageLimitMailBody(),
    };
    try {
      sendAWSEmail(msg);
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }

    await prisma.subscription.update({
      where: { orgId },
      data: { lastLimitAlertSentAt: new Date() },
    });
  }

  return "Done";
}

export function usageLimitMailBody() {
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
        <body style="max-width: 1000px;font-family: 'Lexend', sans-serif;">
          <div class="frame">
            <div class="overlap-group">
              <table aria-describedby="email content">
                <thead>
                  <tr>
                    <th>
                      <img
                        class="rateup-logo"
                          src="${
                            process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL
                          }/images/email/rateup_logo.png"
                          alt="Rateup Logo"
                          width="134"
                          height="76"
                        />
                    </th>
                  </tr>
                  <tr>
                    <th class="email-title">Your Rateup Subscription Usage Limit Reached ❗</th>
                  </tr>
                </thead>
                <tbody>
                 <tr>
                    <td>
                      <p class="email-body">
                        Kindly upgrade your plan to enjoy more of Rateup premium features.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td></td>
                  </tr>
                  <tr>
                  <td><br/>
                  <a href="${statsPage}" class="verify-btn" style="color: #e5e5ef">
                    View Usage Stats
                  </a>
                </td>
                <tr>
                  <td><br/>
                  <a href="${billingPage}" class="verify-btn" style="color: #e5e5ef">
                    Go to Billing
                  </a>
                </td>
                  </tr>
                  
                  
                 
                  <tr>
                    <td></td>
                  </tr>
        
                  <tr>
                    <td></td>
                  </tr>
                  <tr>
                    <td class="thanks"><br />
                      Thank you for choosing Rateup.
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
