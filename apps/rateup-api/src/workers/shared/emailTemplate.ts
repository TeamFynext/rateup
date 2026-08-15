export const rateupLogo = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup-logo-stacked-white-transparent.png`;

export const campaignCompletedEmailTemplate = ({
  campaignName,
  campaignId,
}: {
  campaignName: string;
  campaignId: string;
}) => {
  const frontendURL = process.env.FRONTEND_URL ?? "https://rateup.app";
  return {
    text: "",
    subject: `RateUp - ${campaignName} Completed`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Campaign Completed — RateUp</title>

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
  box-shadow: 0 6px 25px rgba(0,0,0,0.08);
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
  width: 134px;
  height: 128px;
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
}

.cta-row {
  text-align: center;
  margin: 24px 0;
}

.primary-btn {
  display: inline-block;
  padding: 12px 28px;
  border-radius: 40px;
  background: linear-gradient(135deg,#1c518e,#326bb5);
  color: #fff !important;
  font-size: 16px;
  text-decoration: none;
  font-weight: 600;
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

  <div class="header">
    <img class="rateup-logo" src="${rateupLogo}" alt="RateUp Logo" />
  </div>

  <div style="padding:30px 20px;">

  <h1 class="title">${campaignName} - Campaign Completed</h1>
  <p class="subtitle">Your campaign has finished running</p>

    <p class="body-text">
      Great news! Your campaign has successfully finished.
      You can now review the performance and results inside your RateUp dashboard.
    </p>

    <div class="details">
      <h4>Campaign Details</h4>
      <div class="detail-item">
        <strong>Campaign Name:</strong> ${campaignName}
      </div>
      <div class="detail-item">
        <strong>Status:</strong> Completed
      </div>
    </div>

    <div class="cta-row">
      <a href="${frontendURL}/dashboard/campaign/${campaignId}" class="primary-btn" target="_blank">
        View Campaign
      </a>
    </div>

    <p class="thanks">
      Check your dashboard to view campaign insights and results.<br/>
      Team RateUp
    </p>

  </div>

  <div class="footer">

    <div class="footer-social" style="margin-bottom:10px;">
      <a href="https://rateup.app" target="_blank">
        <img src="${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/website_logo.png" />
      </a>

      <a href="https://www.linkedin.com/company/rateup" target="_blank">
        <img src="${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/linkedin_logo.png" />
      </a>

      <a href="https://play.google.com/store/apps/details?id=com.rateupapp.rateup" target="_blank">
        <img src="${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/playstore_logo.png" />
      </a>
    </div>

    <p>
      This email was sent because your campaign on <strong>RateUp</strong> has completed.
    </p>

    <p>
      &copy; ${new Date().getFullYear()} RateUp. All rights reserved.
    </p>

  </div>

</div>

</body>
</html>
`,
  };
};

// weekly email report

export interface TopPerformer {
  userId: string;
  name: string;
  email: string;
  totalMessages: number;
  resolvedChats: number;
  averageResponseTime: string;
  averageResponseTimeSeconds: number;
}

export interface Team {
  teamId: string;
  name: string;
  color: string;
  assignedConversations: number;
  messagesSent: number;
  teamMembers: number;
  teamMembersOnline: number;
  averageResponseTime: string;
  averageResponseTimeSeconds: number;
}

export interface UsageStat {
  totalMessages: number;
  deliveredMessages: number;
  deliveredPercentage: number;
  failedMessages: number;
  failedPercentage: number;
  avgDeliveryTimeSeconds: number | null;
}

export interface WeeklyReportUsage {
  external: UsageStat;
  campaign: UsageStat;
}

export interface WeeklyReportInput {
  orgName: string;
  dateRange: string;
  totalConversations: number;
  resolvedChats: number;
  pendingChats: number;
  averageResponseTime: string;
  topPerformers: TopPerformer[];
  teams: Team[];
  usage: WeeklyReportUsage;
}

export interface WeeklyReportOutput {
  subject: string;
  html: string;
  text: string;
}

function resolveRate(resolved: number, total: number): string {
  if (!total) return "0%";
  return `${((resolved / total) * 100).toFixed(1)}%`;
}

function pendingRate(pending: number, total: number): string {
  if (!total) return "0%";
  return `${((pending / total) * 100).toFixed(1)}%`;
}

/** Rank badge colors */
const RANK_COLORS: Record<number, string> = {
  0: "#f59e0b",
  1: "#9ca3af",
  2: "#d97706",
};

/** Render one performer row */
function performerRow(p: TopPerformer, index: number): string {
  const badgeColor = RANK_COLORS[index] ?? "#6b7280";
  const rank = index + 1;
  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
    style="background:linear-gradient(90deg,#f9fafb 0%,#ffffff 100%);border-radius:12px;border:1px solid #f3f4f6;margin-bottom:10px;">
    <tr>
      <td style="padding:16px 18px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr valign="middle">
            <td width="40" style="padding-right:14px;">
              <div style="width:40px;height:40px;background-color:${badgeColor};border-radius:50%;text-align:center;line-height:40px;font-weight:800;font-size:15px;color:#fff;">#${rank}</div>
            </td>
            <td>
              <div style="font-weight:700;color:#111827;font-size:14px;">${escHtml(p.name)}</div>
              <div style="font-size:12px;color:#9ca3af;margin-top:2px;">${escHtml(p.email)}</div>
            </td>
            <td align="right">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr valign="top">
                  <td style="padding-left:20px;text-align:right;">
                    <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Messages</div>
                    <div style="font-weight:700;font-size:14px;color:#1873E8;">${p.totalMessages}</div>
                  </td>
                  <td style="padding-left:20px;text-align:right;">
                    <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Resolved</div>
                    <div style="font-weight:700;font-size:14px;color:#16a34a;">${p.resolvedChats}</div>
                  </td>
                  <td style="padding-left:20px;text-align:right;">
                    <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Avg Response</div>
                    <div style="font-weight:700;font-size:14px;color:#111827;">${escHtml(p.averageResponseTime)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

/** Render one team card (50% width column) */
function teamCard(team: Team): string {
  // Resolve a safe background color for the icon — fall back to blue if named
  const iconBg = team.color.startsWith("#") ? team.color : "#1873E8";
  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
    style="border:1px solid #e5e7eb;border-radius:14px;background-color:#f9fafb;">
    <tr>
      <td style="padding:18px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;">
          <tr valign="middle">
            <td width="40" style="padding-right:12px;">
              <div style="width:40px;height:40px;background-color:${iconBg};border-radius:10px;text-align:center;line-height:40px;font-size:18px;">👥</div>
            </td>
            <td>
              <div style="font-weight:700;font-size:14px;color:#111827;">${escHtml(team.name)}</div>
              <div style="font-size:12px;color:#9ca3af;margin-top:2px;">${team.teamMembers} members</div>
            </td>
          </tr>
        </table>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="33%" style="padding-right:4px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fff;border-radius:8px;text-align:center;">
                <tr><td style="padding:8px 4px;">
                  <div style="font-size:10px;color:#9ca3af;margin-bottom:3px;">Messages</div>
                  <div style="font-weight:700;font-size:13px;color:#1873E8;">${team.messagesSent}</div>
                </td></tr>
              </table>
            </td>
            <td width="33%" style="padding-right:4px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fff;border-radius:8px;text-align:center;">
                <tr><td style="padding:8px 4px;">
                  <div style="font-size:10px;color:#9ca3af;margin-bottom:3px;">Response</div>
                  <div style="font-weight:700;font-size:13px;color:#16a34a;">${escHtml(team.averageResponseTime)}</div>
                </td></tr>
              </table>
            </td>
            <td width="33%">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fff;border-radius:8px;text-align:center;">
                <tr><td style="padding:8px 4px;">
                  <div style="font-size:10px;color:#9ca3af;margin-bottom:3px;">Assigned</div>
                  <div style="font-weight:700;font-size:13px;color:#ea580c;">${team.assignedConversations}</div>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

/** Render team grid — pairs of 2 per row */
function teamsGrid(teams: Team[]): string {
  if (!teams.length) {
    return `<p style="font-size:13px;color:#9ca3af;text-align:center;padding:16px 0;">No team data available this week.</p>`;
  }

  const rows: string[] = [];
  for (let i = 0; i < teams.length; i += 2) {
    const left = teams[i];
    const right = teams[i + 1];
    rows.push(`
    <tr valign="top">
      <td width="50%" style="padding-right:8px;padding-bottom:16px;">
        ${teamCard(left)}
      </td>
      <td width="50%" style="padding-bottom:16px;">
        ${right ? teamCard(right) : ""}
      </td>
    </tr>`);
  }

  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    ${rows.join("")}
  </table>`;
}

/** Escape HTML special characters */
function escHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text fallback */
function buildPlainText(data: WeeklyReportInput): string {
  const lines: string[] = [
    `RateUp Weekly Performance Report`,
    `${data.dateRange}`,
    `Organisation: ${data.orgName}`,
    ``,
    `── HIGHLIGHTS ──`,
    `Total Conversations : ${data.totalConversations}`,
    `Resolved            : ${data.resolvedChats}`,
    `Pending             : ${data.pendingChats}`,
    `Avg Response Time   : ${data.averageResponseTime}`,
    ``,
    `── TOP PERFORMERS ──`,
  ];

  if (data.topPerformers.length) {
    data.topPerformers.forEach((p, i) => {
      lines.push(
        `#${i + 1} ${p.name} (${p.email}) — ${p.totalMessages} msgs, ${p.resolvedChats} resolved, avg ${p.averageResponseTime}`,
      );
    });
  } else {
    lines.push("No performers data this week.");
  }

  lines.push(``, `── TEAMS ──`);
  data.teams.forEach((t) => {
    lines.push(
      `${t.name}: ${t.messagesSent} messages sent, avg response ${t.averageResponseTime}, ${t.teamMembers} members`,
    );
  });

  lines.push(``, `── WHATSAPP USAGE ──`);
  lines.push(
    `External — Total: ${data.usage.external.totalMessages}, Delivered: ${data.usage.external.deliveredMessages} (${data.usage.external.deliveredPercentage}%), Failed: ${data.usage.external.failedMessages}`,
  );
  lines.push(
    `Campaign — Total: ${data.usage.campaign.totalMessages}, Delivered: ${data.usage.campaign.deliveredMessages} (${data.usage.campaign.deliveredPercentage}%), Failed: ${data.usage.campaign.failedMessages}`,
  );

  lines.push(``, `© 2026 RateUp. All rights reserved.`);
  return lines.join("\n");
}

export function weeklyReportEmailTemplate(data: WeeklyReportInput): WeeklyReportOutput {
  const {
    orgName,
    dateRange,
    totalConversations,
    resolvedChats,
    pendingChats,
    averageResponseTime,
    topPerformers,
    teams,
    usage,
  } = data;

  const resolvedRatePct = resolveRate(resolvedChats, totalConversations);
  const pendingRatePct = pendingRate(pendingChats, totalConversations);

  // ── Top performers section ──
  const topPerformersHtml = topPerformers.length
    ? topPerformers.map((p, i) => performerRow(p, i)).join("")
    : `<p style="font-size:13px;color:#9ca3af;text-align:center;padding:16px 0;">No top performer data available this week.</p>`;

  // ── Usage section ──
  const ext = usage.external;
  const camp = usage.campaign;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>RateUp Weekly Performance Report</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
    body { margin:0 !important; padding:0 !important; width:100% !important; background-color:#f3f4f6; font-family:'Segoe UI',Arial,sans-serif; color:#374151; }
    a { color:#1873E8; text-decoration:none; }
    @media only screen and (max-width:620px) {
      .email-wrapper { width:100% !important; }
      .body-padding  { padding:24px 16px !important; }
      .header-padding { padding:32px 20px !important; }
      .inbox-cell, .team-cell { display:block !important; width:100% !important; padding-right:0 !important; margin-bottom:12px !important; }
      .api-cell { width:50% !important; }
      .footer-padding { padding:24px 16px !important; }
    }
    .rateup-logo {
      width: 134px;
      height: 128px;
      margin-top: 10px;
    }
  </style>
  <!--[if mso]>
  <style type="text/css">body,table,td,a,p,h1,h2,h3{font-family:Arial,sans-serif!important;}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">

<!-- Preheader -->
<div style="display:none;font-size:1px;color:#f3f4f6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  RateUp Weekly Report: ${totalConversations} conversations, ${resolvedRatePct} resolution rate — ${escHtml(dateRange)}
</div>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table class="email-wrapper" role="presentation" border="0" cellpadding="0" cellspacing="0" width="680"
        style="max-width:680px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

        <!-- HEADER -->
        <tr>
          <td class="header-padding" align="center"
            style="background:linear-gradient(135deg,#1873E8 0%,#1565D8 100%);padding:48px 40px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="text-align:center;">
                  <img 
                    class="rateup-logo"
                    src="${rateupLogo}" 
                    alt="RateUp Logo"
                    style="height:128px; width:134px; display:block; margin-top:10px;"
                  />
                </td>
              </tr>
            </table>
            <div style="height:16px;">&nbsp;</div>
            <h1 style="margin:0;font-size:30px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">RateUp</h1>
            <p style="margin:8px 0 4px;font-size:14px;color:rgba(191,219,254,0.9);">Weekly Performance Report</p>
            <p style="margin:0 0 20px;font-size:13px;color:rgba(191,219,254,0.75);">${escHtml(orgName)}</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="background:rgba(255,255,255,0.2);border-radius:999px;padding:8px 18px;">
                  <span style="color:#ffffff;font-size:13px;font-weight:600;">&#128197; ${escHtml(dateRange)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td class="body-padding" style="padding:40px;">

            <!-- Greeting -->
            <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">Hello, Team!</h2>
            <p style="margin:0 0 36px;font-size:15px;color:#6b7280;line-height:1.6;">Here's your weekly performance summary. Great work this week! 🎉</p>

            <!-- HIGHLIGHTS -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:36px;">
              <tr>
                <td>
                  <p style="margin:0 0 18px;font-size:17px;font-weight:700;color:#111827;">📈 Week Highlights</p>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
                    style="background:linear-gradient(135deg,#eff6ff 0%,#f0fdf4 100%);border-left:4px solid #1873E8;border-radius:0 12px 12px 0;">
                    <tr>
                      <td style="padding:24px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td valign="top" width="50%" style="padding-right:20px;">
                              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Total Conversations</p>
                              <div style="font-size:36px;font-weight:800;color:#1873E8;line-height:1;">${totalConversations.toLocaleString()}</div>
                            </td>
                            <td valign="top" width="50%">
                              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Avg Response Time</p>
                              <div style="font-size:36px;font-weight:800;color:#7c3aed;line-height:1;">${escHtml(averageResponseTime)}</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- INBOX PERFORMANCE -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:36px;">
              <tr>
                <td>
                  <p style="margin:0 0 18px;font-size:17px;font-weight:700;color:#111827;">💬 Inbox Performance</p>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr valign="top">
                      <td class="inbox-cell" width="33%" style="padding-right:8px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
                          style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;text-align:center;">
                          <tr><td style="padding:20px 12px;">
                            <div style="width:48px;height:48px;background-color:#22c55e;border-radius:50%;margin:0 auto 14px;line-height:48px;font-size:22px;text-align:center;color:#fff;font-weight:700;">✓</div>
                            <div style="font-size:28px;font-weight:800;color:#16a34a;line-height:1;margin-bottom:4px;">${resolvedChats.toLocaleString()}</div>
                            <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Resolved</div>
                          </td></tr>
                        </table>
                      </td>
                      <td class="inbox-cell" width="33%" style="padding-right:8px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
                          style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:14px;text-align:center;">
                          <tr><td style="padding:20px 12px;">
                            <div style="width:48px;height:48px;background-color:#f97316;border-radius:50%;margin:0 auto 14px;line-height:48px;font-size:22px;text-align:center;color:#fff;">⏱</div>
                            <div style="font-size:28px;font-weight:800;color:#ea580c;line-height:1;margin-bottom:4px;">${pendingChats.toLocaleString()}</div>
                            <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Pending</div>
                          </td></tr>
                        </table>
                      </td>
                      <td class="inbox-cell" width="33%">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
                          style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;text-align:center;">
                          <tr><td style="padding:20px 12px;">
                            <div style="width:48px;height:48px;background-color:#1873E8;border-radius:50%;margin:0 auto 14px;line-height:48px;font-size:22px;text-align:center;color:#fff;">💬</div>
                            <div style="font-size:28px;font-weight:800;color:#1873E8;line-height:1;margin-bottom:4px;">${totalConversations.toLocaleString()}</div>
                            <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Total Chats</div>
                          </td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- TOP PERFORMERS -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:36px;">
              <tr>
                <td>
                  <p style="margin:0 0 18px;font-size:17px;font-weight:700;color:#111827;">🏆 Top Performers This Week</p>
                  ${topPerformersHtml}
                </td>
              </tr>
            </table>

            <!-- TEAMS -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:36px;">
              <tr>
                <td>
                  <p style="margin:0 0 18px;font-size:17px;font-weight:700;color:#111827;">👥 Team Performance</p>
                  ${teamsGrid(teams)}
                </td>
              </tr>
            </table>

            <!-- WHATSAPP USAGE -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:36px;">
              <tr>
                <td>
                  <p style="margin:0 0 18px;font-size:17px;font-weight:700;color:#111827;">📲 WhatsApp Usage</p>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr valign="top">

                      <!-- External -->
                      <td width="50%" style="padding-right:8px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
                          style="border:1px solid #e5e7eb;border-radius:14px;background-color:#f9fafb;">
                          <tr><td style="padding:18px;">
                            <div style="font-weight:700;font-size:14px;color:#111827;margin-bottom:14px;">📤 External Messages</div>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="50%" style="padding-right:4px;">
                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fff;border-radius:8px;text-align:center;">
                                    <tr><td style="padding:8px 4px;">
                                      <div style="font-size:10px;color:#9ca3af;margin-bottom:3px;">Total</div>
                                      <div style="font-weight:700;font-size:13px;color:#1873E8;">${ext.totalMessages}</div>
                                    </td></tr>
                                  </table>
                                </td>
                                <td width="50%">
                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fff;border-radius:8px;text-align:center;">
                                    <tr><td style="padding:8px 4px;">
                                      <div style="font-size:10px;color:#9ca3af;margin-bottom:3px;">Delivered</div>
                                      <div style="font-weight:700;font-size:13px;color:#16a34a;">${ext.deliveredMessages} <span style="font-size:10px;color:#9ca3af;">(${ext.deliveredPercentage}%)</span></div>
                                    </td></tr>
                                  </table>
                                </td>
                              </tr>
                              <tr><td colspan="2" style="padding-top:4px;">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fff;border-radius:8px;text-align:center;">
                                  <tr><td style="padding:8px 4px;">
                                    <div style="font-size:10px;color:#9ca3af;margin-bottom:3px;">Failed</div>
                                    <div style="font-weight:700;font-size:13px;color:#dc2626;">${ext.failedMessages} <span style="font-size:10px;color:#9ca3af;">(${ext.failedPercentage}%)</span></div>
                                  </td></tr>
                                </table>
                              </td></tr>
                            </table>
                          </td></tr>
                        </table>
                      </td>

                      <!-- Campaign -->
                      <td width="50%">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
                          style="border:1px solid #e5e7eb;border-radius:14px;background-color:#f9fafb;">
                          <tr><td style="padding:18px;">
                            <div style="font-weight:700;font-size:14px;color:#111827;margin-bottom:14px;">📣 Campaign Messages</div>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="50%" style="padding-right:4px;">
                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fff;border-radius:8px;text-align:center;">
                                    <tr><td style="padding:8px 4px;">
                                      <div style="font-size:10px;color:#9ca3af;margin-bottom:3px;">Total</div>
                                      <div style="font-weight:700;font-size:13px;color:#1873E8;">${camp.totalMessages}</div>
                                    </td></tr>
                                  </table>
                                </td>
                                <td width="50%">
                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fff;border-radius:8px;text-align:center;">
                                    <tr><td style="padding:8px 4px;">
                                      <div style="font-size:10px;color:#9ca3af;margin-bottom:3px;">Delivered</div>
                                      <div style="font-weight:700;font-size:13px;color:#16a34a;">${camp.deliveredMessages} <span style="font-size:10px;color:#9ca3af;">(${camp.deliveredPercentage}%)</span></div>
                                    </td></tr>
                                  </table>
                                </td>
                              </tr>
                              <tr><td colspan="2" style="padding-top:4px;">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fff;border-radius:8px;text-align:center;">
                                  <tr><td style="padding:8px 4px;">
                                    <div style="font-size:10px;color:#9ca3af;margin-bottom:3px;">Failed</div>
                                    <div style="font-weight:700;font-size:13px;color:#dc2626;">${camp.failedMessages} <span style="font-size:10px;color:#9ca3af;">(${camp.failedPercentage}%)</span></div>
                                  </td></tr>
                                </table>
                              </td></tr>
                            </table>
                          </td></tr>
                        </table>
                      </td>

                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center"
                  style="background:linear-gradient(135deg,#1873E8 0%,#1565D8 100%);border-radius:16px;padding:32px 24px;text-align:center;">
                  <h3 style="margin:0 0 10px;font-size:20px;font-weight:800;color:#ffffff;">Keep up the excellent work! 🚀</h3>
                  <p style="margin:0 0 22px;font-size:14px;color:rgba(191,219,254,0.9);line-height:1.6;">Your team's performance continues to exceed expectations.</p>
                  <a href="https://rateup.app/dashboard/analytics?tab=overview" style="display:inline-block;background-color:#ffffff;color:#1873E8;padding:11px 22px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">
                    👁 View Full Dashboard
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="footer-padding" style="border-top:1px solid #e5e7eb;padding:28px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;">This is an automated weekly report from <strong style="color:#1873E8;">RateUp</strong></p>
            <p style="margin:0 0 16px;font-size:11px;color:#d1d5db;">© 2026 RateUp. All rights reserved.</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td><a href="#" style="font-size:12px;color:#1873E8;text-decoration:none;">Dashboard</a></td>
                <td style="padding:0 8px;font-size:12px;color:#d1d5db;">•</td>
                <td><a href="#" style="font-size:12px;color:#1873E8;text-decoration:none;">Settings</a></td>
                <td style="padding:0 8px;font-size:12px;color:#d1d5db;">•</td>
                <td><a href="#" style="font-size:12px;color:#1873E8;text-decoration:none;">Unsubscribe</a></td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`;

  return {
    subject: `RateUp Weekly Report — ${dateRange}`,
    html,
    text: buildPlainText(data),
  };
}
