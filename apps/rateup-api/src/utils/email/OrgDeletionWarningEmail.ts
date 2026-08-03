import { rateupLogo } from "../constants/constants.js";

export const createInactivityWarningTemplate = ({
  orgName,
  ownerName,
  deadlineDate,
}: {
  orgName: string;
  ownerName: string;
  deadlineDate: string | number | Date;
}) => {
  const formattedDeadline = new Date(deadlineDate).toDateString();

  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Activity Required</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        text-align: center;
        padding: 20px 0;
      }
      .message {
        margin: 20px 0;
        padding: 20px;
        background-color: #f9f9f9;
        border-radius: 5px;
      }
      .warning {
        margin: 20px 0;
        padding: 15px;
        background-color: #fff4f4;
        border-left: 4px solid #d9534f;
        border-radius: 5px;
      }
      .button-container {
        text-align: center;
        margin: 30px 0;
      }
      .btn {
        border-radius: 8px;
        background: #1c518e;
        color: #ffffff;
        text-decoration: none;
        padding: 12px 20px;
        font-size: 14px;
        display: inline-block;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        text-align: center;
        font-size: 12px;
        color: #666;
      }
    </style>
  </head>

  <body>
    <div class="container">
      <div class="header">
        <img
          src="${rateupLogo}"
          alt="Rateup Logo"
          width="134"
          height="128"
        />
      </div>

      <div class="message">
        <h2>Action Required: Organization Inactivity</h2>
        <p>Hi ${ownerName},</p>
        <p>
          We noticed that your organization <strong>${orgName}</strong> has had no activity over the past <strong>6 months</strong>.
        </p>
      </div>

      <div class="warning">
        <p>
          If no activity is detected, your organization will be <strong>scheduled for deletion</strong>.
        </p>
        <p>
          Please take action before <strong>${formattedDeadline}</strong> to keep your organization active.
        </p>
      </div>

      <div class="message">
        <p>
          To prevent deletion, simply log in and perform any activity such as viewing your dashboard, creating surveys, or engaging with your data.
        </p>
      </div>

      <div class="button-container">
        <a href="mailto:hello@rateup.app" class="btn">
          Reach Us
        </a>
      </div>

      <div class="message">
        <p>
          If you believe this is a mistake or need assistance, feel free to contact our support team.
        </p>
      </div>

      <div class="footer">
        <p>This is an automated message. Please do not reply directly to this email.</p>
        <p>© 2026 Rateup. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>`;
};

export const createOrgDeletionReminderTemplate = ({
  orgName,
  ownerName,
  triggeredDate,
  orgId,
}: {
  orgName: string;
  ownerName: string;
  triggeredDate: string | number | Date;
  orgId: string;
}) => {
  const formattedDate = new Date(triggeredDate).toDateString();

  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Org Deletion Reminder</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        text-align: center;
        padding: 20px 0;
      }
      .message {
        margin: 20px 0;
        padding: 20px;
        background-color: #f9f9f9;
        border-radius: 5px;
      }
      .warning {
        margin: 20px 0;
        padding: 15px;
        background-color: #fff4f4;
        border-left: 4px solid #d9534f;
        border-radius: 5px;
      }
      .button-container {
        text-align: center;
        margin: 30px 0;
      }
      .btn {
        border-radius: 8px;
        text-decoration: none;
        padding: 12px 20px;
        font-size: 14px;
        display: inline-block;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        text-align: center;
        font-size: 12px;
        color: #666;
      }
    </style>
  </head>

  <body>
    <div class="container">
      <div class="header">
        <img
          src="${rateupLogo}"
          alt="Rateup Logo"
          width="134"
          height="128"
        />
      </div>

      <div class="message">
        <h2>Organization Deletion Reminder</h2>
        <p>
          The organization <strong>${orgName}</strong> (Owner: ${ownerName}) was flagged inactive on <strong>${formattedDate}</strong>.
        </p>
      </div>

      <div class="warning">
        <p>
          No activity has been detected since the warning was issued. This organization is now eligible for deletion.
        </p>
        <p>
          Please review and proceed with deletion if appropriate.
        </p>
      </div>

      <div class="button-container">
        <a href="${process.env.FRONTEND_URL}/admin/orgs/${orgId}" class="btn">
          Proceed to Review
        </a>
      </div>

      <div class="footer">
        <p>This is an internal reminder from Rateup system.</p>
        <p>© 2026 Rateup. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>`;
};
