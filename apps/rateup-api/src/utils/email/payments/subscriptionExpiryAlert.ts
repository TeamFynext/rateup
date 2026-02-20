import dayjs from "dayjs";
import prisma from "../../prisma.js";
import { formatDateT1 } from "../../date.js";
import { sendAWSEmail } from "../sendAWSEmail.js";
import { billingPage, statsPage } from "../../constants/constants.js";
import { log } from "../../logger.js";

export async function subscriptionExpiryAlert() {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        org: {
          select: {
            owner: true,
          },
        },
        basePlan: true,
      },
    });

    if (!subscriptions || !subscriptions.length) return;
    const thirtyDaysLater = dayjs().add(30, "days").toDate();
    const thirtyDaysRemainingSubscriptions = subscriptions.filter(
      (s) => s.expiresAt.toDateString() === thirtyDaysLater.toDateString(),
    );
    const fifteenDaysLater = dayjs().add(15, "days").toDate();
    const fifteenDaysRemainingSubscriptions = subscriptions.filter(
      (s) => s.expiresAt.toDateString() === fifteenDaysLater.toDateString(),
    );
    const sevenDaysLater = dayjs().add(7, "days").toDate();
    const sevenDaysRemainingSubscriptions = subscriptions.filter(
      (s) => s.expiresAt.toDateString() === sevenDaysLater.toDateString(),
    );
    const threeDaysLater = dayjs().add(3, "days").toDate();
    const threeDaysRemainingSubscriptions = subscriptions.filter(
      (s) => s.expiresAt.toDateString() === threeDaysLater.toDateString(),
    );
    const oneDayLater = dayjs().add(1, "day").toDate();
    const oneDayRemainingSubscriptions = subscriptions.filter(
      (s) => s.expiresAt.toDateString() === oneDayLater.toDateString(),
    );
    const expiredSubscriptions = subscriptions.filter(
      (s) => s.expiresAt.toDateString() === dayjs().toDate().toDateString(),
    );

    await Promise.all([
      reminderBeforeThirtyDays(thirtyDaysRemainingSubscriptions),
      reminderBeforeFifteenDays(fifteenDaysRemainingSubscriptions),
      reminderBeforeSevenDays(sevenDaysRemainingSubscriptions),
      reminderBeforeThreeDays(threeDaysRemainingSubscriptions),
      reminderBeforeOneDay(oneDayRemainingSubscriptions),
      reminderOnExpiry(expiredSubscriptions),
    ]);
    log.info("....All Subscription expiry alert has sent....");
  } catch (e) {
    log.error({ err: e }, "Error sending subscription expiry email");
  }
}

async function reminderBeforeThirtyDays(subscriptions) {
  if (!subscriptions.length) return;

  for (const subscription of subscriptions) {
    log.info(
      `....Sending Subcription Expiry Mail Alert......
          ${subscription?.org?.owner?.email}`,
    );
    const expiryBody = subscriptionExpiryfriendlyReminderBody(subscription);
    const title = `Reminder! Your Rateup Subscription Expires in One Month`;
    const msg = {
      to: subscription?.org?.owner?.email,
      subject: "Rateup Subscription Expiry Alert - Rateup.app",
      text: `Your Rateup Subscription Expires in One Month`,
      html: beforeExpiryTemplate(subscription, expiryBody, title),
    };
    sendAWSEmail(msg);
  }
}

async function reminderBeforeFifteenDays(subscriptions) {
  if (!subscriptions.length) return;
  for (const subscription of subscriptions) {
    log.info(
      `....Sending Subcription Expiry Mail Alert......
          ${subscription?.org?.owner?.email}`,
    );
    const expiryBody = subscriptionExpiryfriendlyReminderBody(subscription);
    const title = `Reminder! Your Rateup Subscription Expires in 15 Days`;
    const msg = {
      to: subscription?.org?.owner?.email,
      subject: "Rateup Subscription Expiry Alert - Rateup.app",
      text: `Your Rateup Subscription Expires in 15 Days`,
      html: beforeExpiryTemplate(subscription, expiryBody, title),
    };
    sendAWSEmail(msg);
  }
}

async function reminderBeforeSevenDays(subscriptions) {
  if (!subscriptions.length) return;
  for (const subscription of subscriptions) {
    log.info(
      `....Sending Subcription Expiry Mail Alert......
          ${subscription?.org?.owner?.email}`,
    );
    const expiryBody = subscriptionExpiryfriendlyReminderBody(subscription);
    const title = `Your Rateup Subscription will Expire in 7 days`;
    const msg = {
      to: subscription?.org?.owner?.email,
      subject: "Rateup Subscription Expiry Alert - Rateup.app",
      text: `Your Rateup Subscription Expires in 7 days`,
      html: beforeExpiryTemplate(subscription, expiryBody, title),
    };
    sendAWSEmail(msg);
  }
}

async function reminderBeforeThreeDays(subscriptions) {
  if (!subscriptions.length) return;
  for (const subscription of subscriptions) {
    log.info(
      `....Sending Subcription Expiry Mail Alert......
          ${subscription?.org?.owner?.email}`,
    );
    const expiryBody = subscriptionExpiryfriendlyReminderBody(subscription);
    const title = `Your Rateup Subscription will Expire in 3 days`;
    const msg = {
      to: subscription?.org?.owner?.email,
      subject: "Rateup Subscription Expiry Alert - Rateup.app",
      text: `Your Rateup Subscription Expires in 3 Days`,
      html: beforeExpiryTemplate(subscription, expiryBody, title),
    };
    sendAWSEmail(msg);
  }
}

async function reminderBeforeOneDay(subscriptions) {
  if (!subscriptions.length) return;
  for (const subscription of subscriptions) {
    log.info(
      `....Sending Subcription Expiry Mail Alert......
          ${subscription?.org?.owner?.email}`,
    );
    const expiryBody = subscriptionExpiryTomorrowReminderBody(subscription);
    const title = `Your Rateup Subscription Expires Tomorrow!`;
    const msg = {
      to: subscription?.org?.owner?.email,
      subject: "Rateup Subscription Expiry Alert - Rateup.app",
      text: `Your Rateup Subscription Expires Tomorrow!`,
      html: beforeExpiryTemplate(subscription, expiryBody, title),
    };
    sendAWSEmail(msg);
  }
}

async function reminderOnExpiry(subscriptions) {
  if (!subscriptions.length) return;
  for (const subscription of subscriptions) {
    log.info(
      `....Sending Subcription Expiry Mail Alert......
          ${subscription?.org?.owner?.email}`,
    );
    await sendSubscriptionExpiryAlertEmail(subscription);
  }
}

export async function sendSubscriptionExpiryAlertEmail(subscription) {
  const expiryBody = subscriptionExpiredReminderBody(subscription);
  const title = `Your Rateup Subscription has Expired`;
  const msg = {
    to: subscription?.org?.owner?.email,
    subject: "Rateup Subscription Expiry Alert - Rateup.app",
    text: `Your Rateup Subscription has Expired`,
    html: beforeExpiryTemplate(subscription, expiryBody, title),
  };
  sendAWSEmail(msg);
}

function subscriptionExpiryfriendlyReminderBody(subscription) {
  return `<tr>
                <td>
                    <p class="email-body">
                     This is a friendly reminder that your subscription to RateUp ${subscription.basePlan.displayName}
                     will expire on ${formatDateT1(subscription.expiresAt)}.
                </p>
             </td>
           </tr>`;
}

function subscriptionExpiryTomorrowReminderBody(subscription) {
  return `<tr>
    <td>
        <p class="email-body">
         This is a gentle reminder that your subscription to RateUp ${subscription.basePlan.displayName}
         will expire on tomorrow.
    </p>
 </td>
</tr>`;
}

function subscriptionExpiredReminderBody(subscription) {
  return `<tr>
    <td>
    <p class="email-body">
         Your subscription to RateUp ${subscription.basePlan.displayName} has expired. 
    </p>
 </td>
</tr>`;
}

function beforeExpiryTemplate(subscription, expiryBody, title) {
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
            font-size: 16px;
            font-style: normal;
            font-weight: 400;
            line-height: normal;
          }
    
          .verify-btn {
            padding: 10px 24px;
            border-radius: 30px;
            background: var(--RateUp-Blue, #1c518e);
            color: #e5e5ef;
            font-size: 18px;
            font-style: normal;
            font-weight: 400;
            line-height: normal;
            cursor: pointer;
            text-decoration: none;
            margin-top:15px; 
          }
    
          .email-icon {
            width: 111px;
            height: 111px;
            flex-shrink: 0;
          }

          .footer {
            text-align: center;
            margin: auto;
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
                  <th class="email-title">${title}</th>
                </tr>
              </thead>
                <tr>
                  <td></td>
                </tr>
                <tr>
                  <td><hr/></td>
                </tr>
              <tbody>
                <tr>
                  <td class="email-body" style="font-weight: 600">
                  <br/>
                  Dear ${subscription.org.owner.name},
                  </td>
                </tr>
                ${expiryBody}
                <tr>
                  <td></td>
                </tr>
                <tr class="footer">
                <td><br/>
                <a href="${statsPage}" class="verify-btn" style="color: #e5e5ef">
                  View Usage Stats
                </a>
                </td>
                </tr>
                <tr>
                  <td></td>
                </tr>
                <tr class="footer">
                <td><br/>
                <a href="${billingPage}" class="verify-btn" style="color: #e5e5ef">
                  View Current Plan
                </a>
                </td>
                </tr>
                <tr>
                  <td></td>
                </tr>
                <tr>
                  <td></td>
                </tr>
                <tr class="footer">
                  <td class="email-body"><br />
                    Thank you for choosing Rateup.
                  </td>
                </tr>
               <tr>
                <td class="email-body">
                <br /><br />
                Best regards,<br />
                RateUp.app <br />
                Website: <a href="https://rateup.app/">https://rateup.app/</a>
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
