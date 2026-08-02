import { escapeHtml } from "../html.js";

/**
 * The notification the RateUp team receives for a contact-form submission.
 *
 * All three fields come from an unauthenticated visitor and used to be
 * interpolated raw, so the visitor chose the markup that rendered in the team's
 * inbox: working links to anywhere, remote images that report when the mail is
 * opened, or content styled to impersonate the rest of the message. Same defect as
 * the BookDemo mailer, issues.txt 16.1/16.2. See issues.txt 22.3.
 */
export function emailBodyContactForm(name: string, email: string, message: string) {
  const body = `
    <html>
    <head>
      <style>
        /* Inline CSS for email */
        body {
          font-family: Arial, sans-serif;
          background-color: #f2f2f2;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #333;
        }
        p {
          font-size: 16px;
          line-height: 1.5;
          color: #555;
        }
        strong, li {
          padding: 20px;
          padding-left:0px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <p>Hello,</p>
        <p>You have received a new message in Rateup website contact form :</p>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(name)}</li>
          <li><strong>Email:</strong> ${escapeHtml(email)}</li>
          <li><strong>Message:</strong> ${escapeHtml(message)}</li>
        </ul>
        <p>Please respond to this inquiry as soon as possible.</p>
        <p>Best regards,</p>
        <p>RateUp.app</p>
      </div>
    </body>
    </html>
  `;

  return body;
}
