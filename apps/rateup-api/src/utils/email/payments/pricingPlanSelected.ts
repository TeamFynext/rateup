export function createEmailBodyPricingPlanSelected(data) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Subscription Interest</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
      font-family: Arial, Helvetica, sans-serif;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    .container {
      max-width: 600px;
      margin: 24px auto;
      background: #f9fafb;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header {
      background: #1c518e;
      color: #fff;
      padding: 16px 24px;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .body {
      padding: 20px 24px;
      color: #1f2937;
      font-size: 14px;
    }
    .details {
      margin-top: 12px;
      width: 100%;
    }
    .details td {
      padding: 6px 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
    }
    .details .label {
      color: #6b7280;
      width: 35%;
    }
    .details .value {
      color: #111827;
    }
     .rateup-logo {
        width: 134px;
        height: 76px;
        margin-top: 10px;
    }
  </style>
</head>
<body>
  <table>
    <tr>
      <td align="center">
        <table class="container">
          <!-- Header -->
          <tr>
            <td class="header">
              <h1>New Subscription Interest</h1>
            </td>
          </tr>
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

          <!-- Body -->
          <tr>
            <td class="body">
              <p><strong>${data.name} </strong> clicked <strong>${data.planName}</strong> plan’s 'start trial' button.</p>
              <p>Here are the captured details:</p>

              <!-- Details Table -->
              <table class="details">
                <tr>
                  <td class="label">Full Name</td>
                  <td class="value">${data.name}</td>
                </tr>
                <tr>
                  <td class="label">Email</td>
                  <td class="value">${data.email}</td>
                </tr>
                <tr>
                  <td class="label">Organization</td>
                  <td class="value">${data.orgName}</td>
                </tr>
                <tr>
                  <td class="label">Plan Selected</td>
                  <td class="value">${data.planName}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
