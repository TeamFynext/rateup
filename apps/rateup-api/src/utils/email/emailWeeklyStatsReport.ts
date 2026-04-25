export const createMessageTemplate = ({ body }) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();

  return `<!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Survey Report</title>
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
              .stats-table {
                      width: 100%;
                      border-collapse: collapse;
                      margin: 20px 0;
              }
              .stats-table th, 
              .stats-table td {
                      padding: 12px;
                      border: 1px solid #ddd;
                      text-align: left;
              }
              .stats-table th {
                      background-color: #f5f5f5;
                      font-weight: bold;
              }
              .stats-table tr:nth-child(even) {
                      background-color: #fafafa;
              }
              .footer {
                      margin-top: 30px;
                      padding-top: 20px;
                      border-top: 1px solid #ddd;
                      text-align: center;
                      font-size: 12px;
                      color: #666;
              }
              .view-response {
                      border-radius: 10px;
                      background:var(--RateUp-Blue, #1c518e);
                      color: #f5f5f5;
                      text-decoration: none;
                      padding: 8px;
                      font-size: 12px;
              }
      </style>
  </head>
  <body>
      <div class="container">
              <div class="header">
                      <img
                        class="rateup-logo"
                        src="${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/rateup_logo.png"
                        alt="Rateup Logo"
                        width="134"
                        height="76"
                      />
              </div>
              
              <div class="message">
                      <h2>Weekly Survey Statistics Report</h2>
                      <p>Please find below the weekly statistics for our Web and WhatsApp surveys for the period of ${startDate.toDateString()} to ${endDate.toDateString()}.</p>
              </div>
            <div style="overflow-x:auto;">
              <table class="stats-table">
                      <thead>
                              <tr>
                                      <th>Title</th>
                                      <th>Total Response</th>
                                      <th>Weekly Response</th>
                                      <th></th>
                              </tr>
                      </thead>
                      <tbody>
                           ${body}
                      </tbody>
              </table>
            </div>
              <div class="message">
                      <p>For detailed analytics, please visit the dashboard <a href="${process.env.FRONTEND_URL}/dashboard" target="blank">visit</a>.</p>
              </div>
  
              <div class="footer">
                      <p>This is an automated report. Please do not reply to this email.</p>
                      <p>© 2026 Rateup. All rights reserved.</p>
              </div>
      </div>
  </body>
  </html>`;
};
