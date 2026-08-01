import { API_URL, rateupLogo } from "../../constants/constants.js";
import { formatDateT1 } from "../../date.js";

export function createEmailBodySubscriptionActivated(
  plan: string,
  validity: Date,
  isRenewed: boolean = false,
) {
  const formattedDate = formatDateT1(validity);

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
                    <th class="email-title">Your Rateup Subscription is ${
                      isRenewed ? "renewed" : "activated"
                    } now ✅</th>
                  </tr>
                </thead>
                <tbody>
                  
                  <tr>
                    <td>
                      <p class="email-body">
                        Recent  ${
                          isRenewed ? "renewal of subscription" : "order"
                        }  created on Rateup.app is successfully processed. 
                        <br/><br/>
                        Subscribed Plan:  <b> ${plan} </b><br/> 
                        Valid till:  <b> ${formattedDate} </b> <br/> <br/>
                        
                       ${plan !== "FREE PLAN" ? "Enjoy your Rateup premium features" : ""}
                      </p>
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

export function createEmailBodyTrialSubscriptionActivated(
  plan: {
    trialDays: number;
    displayName: string | null;
    paymentPlan?: { amount: number; period: string } | null;
  },
  expiresAt: string,
  userName: string,
) {
  return `
      <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Your Trial Started</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { margin:0; padding:0; background:#f5f7fb; font-family: Arial, sans-serif; }
    .container { width:100%; max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; }
    .header { padding:24px; display:flex; justify-content:space-between; align-items:center; }
    .logo { max-width:120px; }
    .account { font-size:14px; color:#6b7280; }
    .hero { background:#f3f6ff; padding:28px 24px; }
    .hero h1 { margin:0; font-size:24px; font-weight:600; color:#111827; }
    .hero p { margin:12px 0 0; font-size:16px; line-height:1.6; color:#374151; }
    .content { padding:24px; font-size:16px; line-height:1.6; color:#374151; }
    .list { margin:0 0 16px 20px; padding:0; }
    .btn { display:inline-block; padding:14px 22px; font-size:16px; font-weight:700; text-decoration:none; border-radius:8px; }
    .btn-primary { background:#2563EB; color:#fff; }
    .btn-dark { background:#111827; color:#fff; padding:12px 20px; font-size:15px; }
    .muted { font-size:14px; color:#6b7280; }
    .card { border:1px solid #e5e7eb; border-radius:8px; padding:12px 16px; margin:16px 0; }
    .footer { text-align:center; font-size:13px; color:#9ca3af; padding:20px; }
    /* Responsive */
    @media only screen and (max-width:600px) {
      .header { flex-direction:column; align-items:flex-start; gap:8px; }
      .content { padding:16px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <img src="${rateupLogo}" alt="{{product_name}} logo" class="logo">
    </div>

    <!-- Hero -->
    <div class="hero">
      <h1>Your RateUp trial has begun 🎉</h1>
      <p>Hi ${userName}, your ${plan.trialDays}-day trial started and ends on <strong>${expiresAt}</strong>.</p>
    </div>

    <!-- Body -->
    <div class="content">
      <p>During your trial you get full access to: All ${plan.displayName} plan features</p>

      <a href="${API_URL}" class="btn btn-primary">Get Started</a>

      <p class="muted">Tip: Add your team, import data, and explore templates to make the most of your trial.</p>

      <div class="notice">
        <strong>Important:</strong> At the end of your trial, 
        your subscription will automatically renew and your payment method will be charged 
        <strong>${plan?.paymentPlan?.amount} / ${plan.paymentPlan?.period}</strong>, unless you cancel before then.
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      © {{current_year}} {{company_name}}. All rights reserved.<br>
    </div>
  </div>
</body>
</html>
      `;
}
